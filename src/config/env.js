require('dotenv').config({ quiet: true });

const config = {
  port: Number(process.env.PORT) || 3000,
  logDir: process.env.LOG_DIR || 'logs',
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    timezone: process.env.DB_TIMEZONE || '+00:00',
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT) || 6379,
  },
};

module.exports = config;
