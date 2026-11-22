// A small reliable job queue on Redis lists.
//
// Producers RPUSH jobs. The worker takes a job with BLMOVE, which atomically
// moves it to "<queue>:processing" instead of deleting it. The job is only
// removed (ack) after it has been handled, so a crash never loses a job:
// recoverStalled() puts anything left in processing back on the queue.

const { getRedis } = require('../config/redis');
const { processingKey, deadLetterKey } = require('./keys');

async function enqueue(queue, job) {
  await getRedis().rpush(queue, JSON.stringify({ attempts: 0, ...job }));
}

/** Waits up to timeoutSeconds for a job. Returns { raw, job } or null. */
async function reserve(blockingClient, queue, timeoutSeconds) {
  const raw = await blockingClient.blmove(queue, processingKey(queue), 'LEFT', 'RIGHT', timeoutSeconds);
  return raw ? { raw, job: JSON.parse(raw) } : null;
}

async function ack(queue, raw) {
  await getRedis().lrem(processingKey(queue), 1, raw);
}

/** Re-queues a failed job, or moves it to the dead-letter list after maxAttempts. */
async function retryOrFail(queue, { raw, job }, maxAttempts) {
  const attempts = job.attempts + 1;
  const target = attempts >= maxAttempts ? deadLetterKey(queue) : queue;
  await getRedis()
    .multi()
    .lrem(processingKey(queue), 1, raw)
    .rpush(target, JSON.stringify({ ...job, attempts }))
    .exec();
  return { attempts, deadLettered: target !== queue };
}

/** Moves every job stuck in processing (e.g. after a crash) back to the queue. */
async function recoverStalled(queue) {
  let recovered = 0;
  while (await getRedis().lmove(processingKey(queue), queue, 'RIGHT', 'LEFT')) recovered += 1;
  return recovered;
}

module.exports = { enqueue, reserve, ack, retryOrFail, recoverStalled };
