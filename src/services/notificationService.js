const Appointment = require('../models/appointmentModel');
const jobQueue = require('../queues/jobQueue');
const { QUEUES } = require('../queues/keys');
const auditLog = require('../utils/auditLogger');

const CONFIRMATION_JOB = 'APPOINTMENT_CONFIRMED';

/**
 * Called after every confirmed booking. A Redis failure is logged but never
 * fails the booking, which is already committed.
 */
async function enqueueConfirmation(appointment) {
  try {
    await jobQueue.enqueue(QUEUES.NOTIFICATIONS, {
      type: CONFIRMATION_JOB,
      appointment_id: appointment.appointment_id,
    });
  } catch (error) {
    console.error(`Could not enqueue confirmation for appointment ${appointment.appointment_id}: ${error.message}`);
    auditLog.logEvent('CONFIRMATION_ENQUEUE_FAILED', {
      appointment_id: appointment.appointment_id,
      error: error.message,
    });
  }
}

function confirmationMessage(appointment) {
  return (
    `Hello ${appointment.patient_name}, your appointment with ${appointment.doctor_name} ` +
    `(${appointment.specialty}, room ${appointment.room}) on ${appointment.appt_datetime} ` +
    `is confirmed. Amount paid: ${appointment.amount_paid.toFixed(2)}.`
  );
}

/**
 * Worker handler: "sends" the confirmation by writing it to the audit log.
 * Uses writeEvent (which rejects on failure) so a failed write is retried.
 */
async function sendConfirmation(job) {
  const appointment = await Appointment.findById(job.appointment_id);
  if (!appointment) return { sent: false, reason: 'APPOINTMENT_NOT_FOUND' };

  await auditLog.writeEvent('CONFIRMATION_SENT', {
    appointment_id: appointment.appointment_id,
    channels: ['SMS', 'EMAIL'],
    sms_to: appointment.patient_phone,
    email_to: appointment.patient_email,
    message: confirmationMessage(appointment),
  });
  return { sent: true };
}

module.exports = { enqueueConfirmation, sendConfirmation };
