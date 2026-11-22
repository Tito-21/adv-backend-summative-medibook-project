const pool = require('../config/db');

const SELECT_APPOINTMENT = `
  SELECT a.appointment_id, a.patient_id, p.full_name AS patient_name,
         a.doctor_id, d.full_name AS doctor_name, d.specialty, d.room,
         a.appt_datetime, a.amount_paid, a.status, a.booked_at,
         a.cancelled_at, a.refund_amount
  FROM appointments a
  JOIN patients p ON p.patient_id = a.patient_id
  JOIN doctors d ON d.doctor_id = a.doctor_id`;

async function findById(appointmentId, db = pool) {
  const [rows] = await db.execute(`${SELECT_APPOINTMENT} WHERE a.appointment_id = ?`, [
    appointmentId,
  ]);
  return rows[0] || null;
}

// active_slot is NULL for cancelled appointments, so these queries only ever
// see live bookings and use the (doctor_id, active_slot) unique index.

async function isDoctorSlotTaken(doctorId, apptDatetime, db = pool) {
  const [rows] = await db.execute(
    'SELECT 1 FROM appointments WHERE doctor_id = ? AND active_slot = ? LIMIT 1',
    [doctorId, apptDatetime],
  );
  return rows.length > 0;
}

async function isPatientBusyAt(patientId, apptDatetime, db = pool) {
  const [rows] = await db.execute(
    'SELECT 1 FROM appointments WHERE patient_id = ? AND active_slot = ? LIMIT 1',
    [patientId, apptDatetime],
  );
  return rows.length > 0;
}

/** Number of active (BOOKED) appointments a doctor has on a date ('YYYY-MM-DD'). */
async function countActiveForDoctorOnDate(doctorId, date, db = pool) {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM appointments
     WHERE doctor_id = ?
       AND active_slot >= ?
       AND active_slot < DATE_ADD(?, INTERVAL 1 DAY)`,
    [doctorId, date, date],
  );
  return rows[0].total;
}

async function create({ patientId, doctorId, apptDatetime, amountPaid }, db = pool) {
  const [result] = await db.execute(
    `INSERT INTO appointments (patient_id, doctor_id, appt_datetime, amount_paid)
     VALUES (?, ?, ?, ?)`,
    [patientId, doctorId, apptDatetime, amountPaid],
  );
  return findById(result.insertId, db);
}

module.exports = {
  findById,
  isDoctorSlotTaken,
  isPatientBusyAt,
  countActiveForDoctorOnDate,
  create,
};
