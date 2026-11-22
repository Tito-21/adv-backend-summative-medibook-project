// Background worker: a separate process from the web server (npm run worker).
//   queue:promotions    -> books the first waitlisted patient into a freed slot
//   queue:notifications -> writes confirmation SMS/email messages to the audit log
const pool = require('./config/db');
const { createRedisClient, getRedis } = require('./config/redis');
const jobQueue = require('./queues/jobQueue');
const Waitlist = require('./queues/waitlistQueue');
const { QUEUES } = require('./queues/keys');
const { JOB_MAX_ATTEMPTS } = require('./config/businessRules');
const { promoteForFreedSlot } = require('./services/waitlistService');
const { sendConfirmation } = require('./services/notificationService');

const BLOCK_TIMEOUT_SECONDS = 5; // how long one BLMOVE waits before checking for shutdown
const RETRY_DELAY_MS = 2000; // pause after a failure so a down database is not hammered

let running = true;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (message) => console.log(`[worker] ${message}`);

const handlers = {
  [QUEUES.PROMOTIONS]: async (job) => {
    const result = await promoteForFreedSlot(job, { now: new Date() });
    log(
      result.promoted
        ? `promoted patient ${result.appointment.patient_id} into ${job.appt_datetime} (appointment ${result.appointment.appointment_id})`
        : `no promotion for doctor ${job.doctor_id} at ${job.appt_datetime}: ${result.reason}`,
    );
  },
  [QUEUES.NOTIFICATIONS]: async (job) => {
    const result = await sendConfirmation(job);
    log(`confirmation for appointment ${job.appointment_id}: ${result.sent ? 'sent' : result.reason}`);
  },
};

async function consume(queue) {
  // Blocking commands need their own connection; null = keep retrying while Redis is down.
  const blockingClient = createRedisClient({ maxRetriesPerRequest: null });

  while (running) {
    let reserved;
    try {
      reserved = await jobQueue.reserve(blockingClient, queue, BLOCK_TIMEOUT_SECONDS);
    } catch (error) {
      log(`cannot read ${queue}: ${error.message}`);
      await sleep(RETRY_DELAY_MS);
      continue;
    }
    if (!reserved) continue;

    try {
      await handlers[queue](reserved.job);
      await jobQueue.ack(queue, reserved.raw);
    } catch (error) {
      try {
        const { attempts, deadLettered } = await jobQueue.retryOrFail(queue, reserved, JOB_MAX_ATTEMPTS);
        log(`job on ${queue} failed (attempt ${attempts}/${JOB_MAX_ATTEMPTS}): ${error.message}` +
          (deadLettered ? ' -> moved to dead-letter list' : ' -> will retry'));
      } catch (requeueError) {
        // The job stays in the processing list and is recovered on the next start.
        log(`could not re-queue job on ${queue}: ${requeueError.message}`);
      }
      await sleep(RETRY_DELAY_MS);
    }
  }

  blockingClient.disconnect();
}

async function main() {
  // Anything left half-done by a previous crash goes back where it came from.
  const recoveredPatients = await Waitlist.recoverStalled();
  const recoveredJobs =
    (await jobQueue.recoverStalled(QUEUES.PROMOTIONS)) +
    (await jobQueue.recoverStalled(QUEUES.NOTIFICATIONS));
  log(`started (recovered ${recoveredPatients} waitlist entries, ${recoveredJobs} jobs)`);

  await Promise.all([consume(QUEUES.PROMOTIONS), consume(QUEUES.NOTIFICATIONS)]);

  await pool.end();
  await getRedis().quit();
  log('stopped');
}

function shutdown(signal) {
  log(`${signal} received, finishing current jobs...`);
  running = false;
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((error) => {
  console.error(`[worker] fatal: ${error.message}`);
  process.exit(1);
});
