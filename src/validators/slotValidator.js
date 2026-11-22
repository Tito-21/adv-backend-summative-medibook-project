const {
  SLOT_LENGTH_MINUTES,
  WORKDAY_START,
  WORKDAY_END,
} = require('../config/businessRules');
const { parseClinicDateTime } = require('../utils/clinicTime');

// Clinic local time, e.g. 2026-11-25T09:30, 2026-11-25 09:30 or 2026-11-25T09:30:00
const DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;
const FORMAT_MESSAGE = 'appt_datetime must be a valid date and time in the format YYYY-MM-DDTHH:MM';

function toMinutes(hhmm) {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

function toHHMM(totalMinutes) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
}

const FIRST_SLOT_MINUTES = toMinutes(WORKDAY_START);
const LAST_SLOT_MINUTES = toMinutes(WORKDAY_END) - SLOT_LENGTH_MINUTES;
const WORKING_HOURS_MESSAGE =
  `Appointments must be within working hours ${WORKDAY_START}-${WORKDAY_END} ` +
  `(last slot starts ${toHHMM(LAST_SLOT_MINUTES)})`;

function isRealCalendarDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Checks a requested appointment time against the slot rules.
 * Returns:
 *   { isFormatError: true,  errors }        -> malformed input (HTTP 400)
 *   { isFormatError: false, errors }        -> breaks a booking rule (HTTP 422)
 *   { isFormatError: false, errors: [], slot } when valid, where slot is
 *     { dbValue: 'YYYY-MM-DD HH:MM:00', date: 'YYYY-MM-DD', at: Date }
 */
function validateAppointmentSlot(input, { now, timezoneOffset }) {
  const match = typeof input === 'string' ? DATETIME_PATTERN.exec(input.trim()) : null;
  if (!match) return { isFormatError: true, errors: [FORMAT_MESSAGE] };

  const [, year, month, day, hours, minutes, seconds = '00'] = match;
  if (
    !isRealCalendarDate(Number(year), Number(month), Number(day)) ||
    Number(hours) > 23 ||
    Number(minutes) > 59 ||
    Number(seconds) > 59
  ) {
    return { isFormatError: true, errors: [FORMAT_MESSAGE] };
  }

  const errors = [];
  const minuteOfDay = Number(hours) * 60 + Number(minutes);

  if (Number(minutes) % SLOT_LENGTH_MINUTES !== 0 || seconds !== '00') {
    errors.push(`Appointments start on a ${SLOT_LENGTH_MINUTES}-minute boundary (e.g. 09:00 or 09:30)`);
  }
  if (minuteOfDay < FIRST_SLOT_MINUTES || minuteOfDay > LAST_SLOT_MINUTES) {
    errors.push(WORKING_HOURS_MESSAGE);
  }

  const date = `${year}-${month}-${day}`;
  const dbValue = `${date} ${hours}:${minutes}:00`;
  const at = parseClinicDateTime(dbValue, timezoneOffset);

  if (at.getTime() <= now.getTime()) {
    errors.push('Appointments can only be booked in the future');
  }

  if (errors.length) return { isFormatError: false, errors };
  return { isFormatError: false, errors: [], slot: { dbValue, date, at } };
}

module.exports = { validateAppointmentSlot };
