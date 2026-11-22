// Moves dead-lettered jobs back onto their queues (e.g. after a database
// outage has been fixed). The running worker then processes them again.
// Usage: npm run jobs:retry-failed
const { getRedis } = require('../src/config/redis');
const { QUEUES, deadLetterKey } = require('../src/queues/keys');

async function main() {
  const redis = getRedis();
  for (const queue of Object.values(QUEUES)) {
    const raws = await redis.lrange(deadLetterKey(queue), 0, -1);
    for (const raw of raws) {
      const job = { ...JSON.parse(raw), attempts: 0 };
      await redis.multi().lrem(deadLetterKey(queue), 1, raw).rpush(queue, JSON.stringify(job)).exec();
    }
    console.log(`${queue}: re-queued ${raws.length} failed job(s)`);
  }
  await redis.quit();
}

main().catch((error) => {
  console.error(`Retry failed: ${error.message}`);
  process.exit(1);
});
