// Converts between clinic wall-clock strings ('YYYY-MM-DD HH:MM:SS', as stored
// in MySQL) and JS Date instants, using the clinic's UTC offset (e.g. '+03:00').

const OFFSET_PATTERN = /^([+-])(\d{2}):(\d{2})$/;
const MS_PER_MINUTE = 60 * 1000;

function offsetToMinutes(offset) {
  const match = OFFSET_PATTERN.exec(offset);
  if (!match) throw new Error(`Invalid UTC offset: ${offset}`);
  const [, sign, hours, minutes] = match;
  const total = Number(hours) * 60 + Number(minutes);
  return sign === '-' ? -total : total;
}

/** '2026-11-25 09:00:00' (clinic time) -> Date */
function parseClinicDateTime(value, offset) {
  return new Date(`${value.replace(' ', 'T')}${offset}`);
}

/** Date -> '2026-11-25 09:00:00' (clinic time) */
function formatClinicDateTime(date, offset) {
  const shifted = new Date(date.getTime() + offsetToMinutes(offset) * MS_PER_MINUTE);
  return shifted.toISOString().slice(0, 19).replace('T', ' ');
}

module.exports = { parseClinicDateTime, formatClinicDateTime };
