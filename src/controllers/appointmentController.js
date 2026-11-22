const Appointment = require('../models/appointmentModel');
const HttpError = require('../utils/HttpError');
const config = require('../config/env');
const { requireIdParam } = require('../utils/requestHelpers');
const { validateBookingRequest } = require('../validators/bookingValidator');
const { bookAppointment } = require('../services/bookingService');

async function getAppointment(req, res) {
  const appointmentId = requireIdParam(req, 'Appointment');
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw HttpError.notFound(`Appointment ${appointmentId} not found`);
  res.json(appointment);
}

async function createAppointment(req, res) {
  const { status, errors, data } = validateBookingRequest(req.body, {
    now: new Date(),
    timezoneOffset: config.db.timezone,
  });
  if (errors.length) {
    throw new HttpError(status, 'Invalid booking request', errors);
  }

  const appointment = await bookAppointment(data);
  res
    .status(201)
    .location(`/api/appointments/${appointment.appointment_id}`)
    .json(appointment);
}

module.exports = { getAppointment, createAppointment };
