// Decides what to do when booking a waitlisted patient into a freed slot fails.
// Pure function (no Redis/MySQL), so it is unit tested.

const PROMOTION_OUTCOME = Object.freeze({
  // The slot cannot be given to anyone now (someone booked it directly, or it
  // is in the past). Put the patient back at the front and stop.
  SLOT_GONE: 'SLOT_GONE',
  // Only this patient cannot take it (already has an appointment at that time).
  // Keep their place in the queue and try the next patient.
  SKIP_PATIENT: 'SKIP_PATIENT',
  // The patient no longer exists. Remove the entry.
  DROP_ENTRY: 'DROP_ENTRY',
  // Infrastructure problem (database down, deadlock...). Put the patient back
  // at the front and retry the whole job later.
  RETRY: 'RETRY',
});

const SLOT_UNAVAILABLE_REASONS = ['SLOT_TAKEN', 'DAY_FULL'];

function classifyPromotionError(error) {
  const status = error?.status;

  if (status === 409) {
    return SLOT_UNAVAILABLE_REASONS.includes(error.details?.reason)
      ? PROMOTION_OUTCOME.SLOT_GONE
      : PROMOTION_OUTCOME.SKIP_PATIENT;
  }
  if (status === 404) return PROMOTION_OUTCOME.DROP_ENTRY;
  if (status === 400 || status === 422) return PROMOTION_OUTCOME.SLOT_GONE;
  return PROMOTION_OUTCOME.RETRY;
}

module.exports = { PROMOTION_OUTCOME, classifyPromotionError };
