const { validateAppointmentSlot } = require('./slotValidator');

const ALLOWED_FIELDS = ['patient_id', 'doctor_id', 'appt_datetime'];

function isPositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

/**
 * Validates a booking request.
 * Returns { status: 400 | 422, errors } when invalid, or { errors: [], data } where
 * data = { patientId, doctorId, slot }.
 */
function validateBookingRequest(body, { now, timezoneOffset }) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { status: 400, errors: ['Request body must be a JSON object'] };
  }

  const errors = Object.keys(body)
    .filter((field) => !ALLOWED_FIELDS.includes(field))
    .map((field) => `Unknown field: ${field}`);

  if (!isPositiveInteger(body.patient_id)) errors.push('patient_id must be a positive integer');
  if (!isPositiveInteger(body.doctor_id)) errors.push('doctor_id must be a positive integer');

  const slotResult = validateAppointmentSlot(body.appt_datetime, { now, timezoneOffset });
  if (slotResult.isFormatError) errors.push(...slotResult.errors);

  if (errors.length) return { status: 400, errors };
  if (slotResult.errors.length) return { status: 422, errors: slotResult.errors };

  return {
    errors: [],
    data: { patientId: body.patient_id, doctorId: body.doctor_id, slot: slotResult.slot },
  };
}

module.exports = { validateBookingRequest };
