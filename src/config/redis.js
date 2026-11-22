const Redis = require('ioredis');
const config = require('./env');

function createRedisClient(overrides = {}) {
  const client = new Redis({ ...config.redis, ...overrides });

  // ioredis reconnects automatically; report each distinct error once instead
  // of printing an "unhandled error" on every reconnect attempt.
  let lastError = null;
  client.on('error', (error) => {
    if (error.message === lastError) return;
    lastError = error.message;
    console.error(`Redis error: ${error.message}`);
  });
  client.on('ready', () => {
    lastError = null;
  });

  return client;
}

// Shared client for normal (non-blocking) commands, created on first use so
// that importing this module never opens a connection (keeps unit tests offline).
// maxRetriesPerRequest: 1 makes commands fail fast instead of hanging if Redis is down.
let sharedClient = null;

function getRedis() {
  sharedClient ??= createRedisClient({ maxRetriesPerRequest: 1 });
  return sharedClient;
}

module.exports = { createRedisClient, getRedis };
