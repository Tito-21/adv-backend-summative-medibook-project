const pool = require('../config/db');
const { buildSetClause } = require('./sqlHelpers');

const SELECT_COLUMNS = 'patient_id, full_name, email, phone, created_at';
const UPDATABLE_COLUMNS = ['full_name', 'email', 'phone'];

async function findAll() {
  const [rows] = await pool.execute(
    `SELECT ${SELECT_COLUMNS} FROM patients ORDER BY patient_id`,
  );
  return rows;
}

async function findById(patientId) {
  const [rows] = await pool.execute(
    `SELECT ${SELECT_COLUMNS} FROM patients WHERE patient_id = ?`,
    [patientId],
  );
  return rows[0] || null;
}

async function create({ full_name, email, phone }) {
  const [result] = await pool.execute(
    'INSERT INTO patients (full_name, email, phone) VALUES (?, ?, ?)',
    [full_name, email, phone],
  );
  return findById(result.insertId);
}

/** Returns the updated patient, or null if no patient has this id. */
async function update(patientId, fields) {
  const { clause, values } = buildSetClause(fields, UPDATABLE_COLUMNS);
  const [result] = await pool.execute(
    `UPDATE patients SET ${clause} WHERE patient_id = ?`,
    [...values, patientId],
  );
  return result.affectedRows === 0 ? null : findById(patientId);
}

/** Returns true if a patient was deleted. */
async function remove(patientId) {
  const [result] = await pool.execute('DELETE FROM patients WHERE patient_id = ?', [patientId]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, remove };
