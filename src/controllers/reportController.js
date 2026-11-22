const Report = require('../models/reportModel');
const HttpError = require('../utils/HttpError');
const { requireIdParam } = require('../utils/requestHelpers');
const {
  MAX_APPOINTMENTS_PER_DAY,
  STATS_UPCOMING_DAYS,
  BUSY_DAY_THRESHOLD,
} = require('../config/businessRules');

// All figures below are computed by SQL in reportModel; this layer only shapes the JSON.

async function getDoctorStats(req, res) {
  const doctorId = requireIdParam(req, 'Doctor');
  const summary = await Report.getDoctorSummary(doctorId);
  if (!summary) throw HttpError.notFound(`Doctor ${doctorId} not found`);

  const days = await Report.getDoctorDailyLoad(doctorId, STATS_UPCOMING_DAYS, MAX_APPOINTMENTS_PER_DAY);
  const { doctor_id, full_name, specialty, ...figures } = summary;

  res.json({
    doctor: { doctor_id, full_name, specialty },
    ...figures,
    next_7_days: {
      daily_cap: MAX_APPOINTMENTS_PER_DAY,
      total_appointments: days[0].period_appointments,
      utilization_percent: days[0].period_utilization_percent,
      days: days.map(({ date, appointments, utilization_percent }) => ({
        date,
        appointments,
        utilization_percent,
      })),
    },
  });
}

async function getDoctorsReport(req, res) {
  res.json(await Report.getDoctorsReport());
}

async function getBusyDaysReport(req, res) {
  res.json({
    rule: `more than ${BUSY_DAY_THRESHOLD * 100}% of ${MAX_APPOINTMENTS_PER_DAY} daily slots booked`,
    busy_days: await Report.getBusyDays(MAX_APPOINTMENTS_PER_DAY, BUSY_DAY_THRESHOLD),
  });
}

module.exports = { getDoctorStats, getDoctorsReport, getBusyDaysReport };
