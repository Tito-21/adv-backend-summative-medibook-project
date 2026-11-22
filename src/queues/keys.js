// All Redis key names in one place.

const QUEUES = Object.freeze({
  PROMOTIONS: 'queue:promotions', // "a slot was freed" jobs for the worker
  NOTIFICATIONS: 'queue:notifications', // confirmation SMS/email jobs
});

const processingKey = (queue) => `${queue}:processing`;
const deadLetterKey = (queue) => `${queue}:failed`;

// Patients taken off a waitlist while the worker tries to book them.
const WAITLIST_PROCESSING = 'waitlist:processing';

const WAITLIST_SCOPE = Object.freeze({
  SLOT: 'SLOT', // waiting for one exact slot (it was taken)
  DAY: 'DAY', // waiting for any slot that day (the day was full)
});

const slotWaitlistKey = (doctorId, apptDatetime) => `waitlist:slot:${doctorId}:${apptDatetime}`;
const dayWaitlistKey = (doctorId, date) => `waitlist:day:${doctorId}:${date}`;

/** The waitlist key an entry belongs to (entries carry everything needed). */
function waitlistKeyFor(entry) {
  return entry.scope === WAITLIST_SCOPE.SLOT
    ? slotWaitlistKey(entry.doctor_id, entry.appt_datetime)
    : dayWaitlistKey(entry.doctor_id, entry.date);
}

module.exports = {
  QUEUES,
  WAITLIST_PROCESSING,
  WAITLIST_SCOPE,
  processingKey,
  deadLetterKey,
  slotWaitlistKey,
  dayWaitlistKey,
  waitlistKeyFor,
};
