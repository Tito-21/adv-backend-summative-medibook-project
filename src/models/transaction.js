const pool = require('../config/db');

/**
 * Runs `work(connection)` inside a transaction: commits if it resolves, rolls
 * back if it throws. Model functions accept this connection as their `db`
 * argument so every statement in `work` is part of the same transaction.
 *
 * READ COMMITTED makes each SELECT see rows committed by other transactions
 * after we acquired our locks (the default REPEATABLE READ could keep reading
 * an older snapshot and miss a booking that was committed while we waited).
 */
async function withTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { withTransaction };
