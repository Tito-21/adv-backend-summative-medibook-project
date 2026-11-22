const HttpError = require('../utils/HttpError');
const config = require('../config/env');
const { parseId } = require('../validators/fieldValidator');
const { isValidDate } = require('../validators/slotValidator');
const { validateBookingRequest } = require('../validators/bookingValidator');
const { joinWaitlist, getWaitlist } = require('../services/waitlistService');

async function joinWaitlistHandler(req, res) {
  const { status, errors, data } = validateBookingRequest(req.body, {
    now: new Date(),
    timezoneOffset: config.db.timezone,
  });
  if (errors.length) throw new HttpError(status, 'Invalid waitlist request', errors);

  const entry = await joinWaitlist(data);
  res.status(201).json({
    message: `Added to the waitlist at position ${entry.position}. You will be booked automatically if a slot frees up.`,
    waitlist: entry,
  });
}

async function getWaitlistHandler(req, res) {
  const doctorId = parseId(req.query.doctor_id);
  const { date } = req.query;
  const errors = [];
  if (!doctorId) errors.push('doctor_id query parameter must be a positive integer');
  if (!isValidDate(date)) errors.push('date query parameter must be a valid date (YYYY-MM-DD)');
  if (errors.length) throw HttpError.badRequest('Invalid waitlist query', errors);

  res.json(await getWaitlist(doctorId, date));
}

module.exports = { joinWaitlistHandler, getWaitlistHandler };
