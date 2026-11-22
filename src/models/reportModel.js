const pool = require('../config/db');

// Money the clinic keeps from an appointment: what was paid minus any refund.
// Booked appointments count in full; cancelled ones count what was not refunded.
const REVENUE_COLLECTED = 'COALESCE(SUM(a.amount_paid - COALESCE(a.refund_amount, 0)), 0)';

/** Revenue and upcoming count for one doctor, or null if the doctor does not exist. */
async function getDoctorSummary(doctorId) {
  const [rows] = await pool.execute(
    `SELECT d.doctor_id, d.full_name, d.specialty,
            ${REVENUE_COLLECTED} AS revenue_collected,
            COALESCE(SUM(a.refund_amount), 0) AS total_refunded,
            COUNT(CASE WHEN a.status = 'BOOKED' AND a.appt_datetime > NOW() THEN 1 END)
              AS upcoming_appointments
     FROM doctors d
     LEFT JOIN appointments a ON a.doctor_id = d.doctor_id
     WHERE d.doctor_id = ?
     GROUP BY d.doctor_id, d.full_name, d.specialty`,
    [doctorId],
  );
  return rows[0] || null;
}

/**
 * Active appointments per day for the next `days` days (starting today),
 * including days with none. A recursive CTE generates the dates; the window
 * function adds utilization for the whole period against the daily cap.
 */
async function getDoctorDailyLoad(doctorId, days, dailyCap) {
  const [rows] = await pool.execute(
    `WITH RECURSIVE calendar AS (
       SELECT CURDATE() AS day, 1 AS day_number
       UNION ALL
       SELECT day + INTERVAL 1 DAY, day_number + 1 FROM calendar WHERE day_number < ?
     )
     SELECT DATE_FORMAT(c.day, '%Y-%m-%d') AS date,
            COUNT(a.appointment_id) AS appointments,
            ROUND(COUNT(a.appointment_id) / ? * 100, 1) AS utilization_percent,
            SUM(COUNT(a.appointment_id)) OVER () AS period_appointments,
            ROUND(SUM(COUNT(a.appointment_id)) OVER () / (? * ?) * 100, 1)
              AS period_utilization_percent
     FROM calendar c
     LEFT JOIN appointments a
       ON a.doctor_id = ?
      AND a.active_slot >= c.day
      AND a.active_slot < c.day + INTERVAL 1 DAY
     GROUP BY c.day
     ORDER BY c.day`,
    [days, dailyCap, dailyCap, days, doctorId],
  );
  return rows;
}

/** Every doctor's appointment totals and revenue, including doctors with none. */
async function getDoctorsReport() {
  const [rows] = await pool.execute(
    `SELECT d.doctor_id, d.full_name, d.specialty,
            COUNT(CASE WHEN a.status = 'BOOKED' THEN 1 END) AS total_appointments,
            COUNT(CASE WHEN a.status = 'CANCELLED' THEN 1 END) AS cancelled_appointments,
            ${REVENUE_COLLECTED} AS revenue_collected
     FROM doctors d
     LEFT JOIN appointments a ON a.doctor_id = d.doctor_id
     GROUP BY d.doctor_id, d.full_name, d.specialty
     ORDER BY revenue_collected DESC, d.doctor_id`,
  );
  return rows;
}

/** Every (doctor, date) where active bookings exceed `threshold` of the daily cap. */
async function getBusyDays(dailyCap, threshold) {
  const [rows] = await pool.execute(
    `SELECT d.doctor_id, d.full_name,
            DATE_FORMAT(a.active_slot, '%Y-%m-%d') AS date,
            COUNT(*) AS booked,
            ? AS capacity,
            ROUND(COUNT(*) / ? * 100, 1) AS utilization_percent
     FROM appointments a
     JOIN doctors d ON d.doctor_id = a.doctor_id
     WHERE a.active_slot IS NOT NULL
     GROUP BY d.doctor_id, d.full_name, date
     HAVING COUNT(*) / ? > ?
     ORDER BY date, d.doctor_id`,
    [dailyCap, dailyCap, dailyCap, threshold],
  );
  return rows;
}

module.exports = { getDoctorSummary, getDoctorDailyLoad, getDoctorsReport, getBusyDays };
