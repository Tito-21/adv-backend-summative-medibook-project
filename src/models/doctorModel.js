const pool = require('../config/db');
const { buildSetClause } = require('./sqlHelpers');

const SELECT_COLUMNS =
  'doctor_id, full_name, email, specialty, consultation_fee, room, created_at';
const UPDATABLE_COLUMNS = ['full_name', 'email', 'specialty', 'consultation_fee', 'room'];

async function findAll() {
  const [rows] = await pool.execute(
    `SELECT ${SELECT_COLUMNS} FROM doctors ORDER BY doctor_id`,
  );
  return rows;
}

async function findById(doctorId) {
  const [rows] = await pool.execute(
    `SELECT ${SELECT_COLUMNS} FROM doctors WHERE doctor_id = ?`,
    [doctorId],
  );
  return rows[0] || null;
}

/**
 * Reads a doctor and locks the row until the transaction ends. Every booking
 * for this doctor locks the same row first, so concurrent bookings for one
 * doctor run one after another and cannot both take the last slot.
 */
async function findByIdForUpdate(doctorId, db) {
  const [rows] = await db.execute(
    `SELECT ${SELECT_COLUMNS} FROM doctors WHERE doctor_id = ? FOR UPDATE`,
    [doctorId],
  );
  return rows[0] || null;
}

async function create({ full_name, email, specialty, consultation_fee, room }) {
  const [result] = await pool.execute(
    `INSERT INTO doctors (full_name, email, specialty, consultation_fee, room)
     VALUES (?, ?, ?, ?, ?)`,
    [full_name, email, specialty, consultation_fee, room],
  );
  return findById(result.insertId);
}

/** Returns the updated doctor, or null if no doctor has this id. */
async function update(doctorId, fields) {
  const { clause, values } = buildSetClause(fields, UPDATABLE_COLUMNS);
  const [result] = await pool.execute(
    `UPDATE doctors SET ${clause} WHERE doctor_id = ?`,
    [...values, doctorId],
  );
  return result.affectedRows === 0 ? null : findById(doctorId);
}

/** Returns true if a doctor was deleted. */
async function remove(doctorId) {
  const [result] = await pool.execute('DELETE FROM doctors WHERE doctor_id = ?', [doctorId]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, findByIdForUpdate, create, update, remove };
