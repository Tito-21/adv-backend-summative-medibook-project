const Appointment = require('../models/appointmentModel');
const Doctor = require('../models/doctorModel');
const Patient = require('../models/patientModel');
const { withTransaction } = require('../models/transaction');
const HttpError = require('../utils/HttpError');
const { MAX_APPOINTMENTS_PER_DAY } = require('../config/businessRules');
const auditLog = require('../utils/auditLogger');
const { enqueueConfirmation } = require('./notificationService');

function slotUnavailable(reason, message) {
  return HttpError.conflict(message, {
    reason,
    waitlist_available: true,
    join_waitlist: { method: 'POST', path: '/api/waitlist', body: 'same body as this booking' },
  });
}

/**
 * Books an appointment inside one transaction.
 * The doctor row is locked first, so concurrent bookings for the same doctor
 * are processed one at a time: the slot check and the daily-cap count always
 * see every booking committed before ours.
 */
async function bookAppointment({ patientId, doctorId, slot }) {
  const appointment = await withTransaction(async (tx) => {
    const doctor = await Doctor.findByIdForUpdate(doctorId, tx);
    if (!doctor) throw HttpError.notFound(`Doctor ${doctorId} not found`);

    const patient = await Patient.findById(patientId, tx);
    if (!patient) throw HttpError.notFound(`Patient ${patientId} not found`);

    if (await Appointment.isDoctorSlotTaken(doctorId, slot.dbValue, tx)) {
      throw slotUnavailable('SLOT_TAKEN', `${doctor.full_name} is already booked at ${slot.dbValue}`);
    }

    const bookedThatDay = await Appointment.countActiveForDoctorOnDate(doctorId, slot.date, tx);
    if (bookedThatDay >= MAX_APPOINTMENTS_PER_DAY) {
      throw slotUnavailable(
        'DAY_FULL',
        `${doctor.full_name} already has the maximum of ${MAX_APPOINTMENTS_PER_DAY} appointments on ${slot.date}`,
      );
    }

    if (await Appointment.isPatientBusyAt(patientId, slot.dbValue, tx)) {
      throw HttpError.conflict(`Patient ${patientId} already has an appointment at ${slot.dbValue}`);
    }

    return Appointment.create(
      {
        patientId,
        doctorId,
        apptDatetime: slot.dbValue,
        amountPaid: doctor.consultation_fee, // priced by the server, never by the client
      },
      tx,
    );
  });

  // Only reached after COMMIT. Not awaited: logging and queueing must never
  // slow down or fail the booking (both handle their own errors).
  auditLog.logEvent('APPOINTMENT_BOOKED', {
    appointment_id: appointment.appointment_id,
    patient_id: appointment.patient_id,
    doctor_id: appointment.doctor_id,
    appt_datetime: appointment.appt_datetime,
    amount_paid: appointment.amount_paid,
  });
  enqueueConfirmation(appointment);

  return appointment;
}

module.exports = { bookAppointment };
