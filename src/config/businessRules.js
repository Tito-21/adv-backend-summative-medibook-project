// Every clinic business value is defined here once and imported where needed.

module.exports = Object.freeze({
  // Appointment slots
  SLOT_LENGTH_MINUTES: 30,
  WORKDAY_START: '09:00', // first slot starts
  WORKDAY_END: '17:00', // last slot must finish by this time (so starts at 16:30)
  MAX_APPOINTMENTS_PER_DAY: 12,

  // Refund policy (hours of notice before the appointment):
  //   more than 48h      -> 100%
  //   24h to 48h (incl.) -> 50%
  //   less than 24h      -> 0%
  FULL_REFUND_ABOVE_HOURS: 48,
  PARTIAL_REFUND_FROM_HOURS: 24,
  FULL_REFUND_PERCENT: 100,
  PARTIAL_REFUND_PERCENT: 50,
  NO_REFUND_PERCENT: 0,

  // Reports
  BUSY_DAY_THRESHOLD: 0.8, // a doctor-day is "busy" above 80% of capacity
  STATS_UPCOMING_DAYS: 7,

  // Background jobs (waitlist promotions, confirmation messages)
  JOB_MAX_ATTEMPTS: 3, // then the job is moved to "<queue>:failed"
});
