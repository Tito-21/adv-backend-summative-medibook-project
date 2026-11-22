// Creates the schema and loads the seed data without needing the mysql CLI.
// Usage: npm run db:setup            (schema + seed)
//        npm run db:setup -- --no-seed (schema only)
const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config/env');

const DATABASE_DIR = path.join(__dirname, '..', 'database');

async function runSqlFile(connection, fileName) {
  const sql = await fs.readFile(path.join(DATABASE_DIR, fileName), 'utf8');
  await connection.query(sql);
  console.log(`Ran ${fileName}`);
}

async function main() {
  const { database, ...connectionOptions } = config.db;
  const connection = await mysql.createConnection({
    ...connectionOptions,
    multipleStatements: true,
  });

  try {
    await connection.query('SET time_zone = ?', [config.db.timezone]);
    await runSqlFile(connection, 'schema.sql');
    if (!process.argv.includes('--no-seed')) {
      await runSqlFile(connection, 'seed.sql');
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(`Database setup failed: ${error.message}`);
  process.exit(1);
});
