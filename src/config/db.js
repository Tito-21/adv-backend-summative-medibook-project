const mysql = require('mysql2/promise');
const config = require('./env');

const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  // Return DATETIME columns as 'YYYY-MM-DD HH:MM:SS' strings in clinic time
  // instead of JS Date objects, so API responses are not shifted to UTC.
  dateStrings: true,
});

// Make NOW() and CURDATE() inside MySQL use the clinic's time zone.
pool.pool.on('connection', (connection) => {
  connection.query('SET time_zone = ?', [config.db.timezone]);
});

module.exports = pool;
