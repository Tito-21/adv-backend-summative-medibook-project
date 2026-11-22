const Appointment = require('../models/appointmentModel');
const { withTransaction } = require('../models/transaction');
const HttpError = require('../utils/HttpError');
const { calculateRefund } = require('./refundPolicy');
const { parseClinicDateTime, formatClinicDateTime } = require('../utils/clinicTime');
const auditLog = require('../utils/auditLogger');

/**
 * Cancels an appointment and records the refund in one transaction.
 * The refund is always computed here from the notice given, never taken
 * from the client.
 */
async function cancelAppointment(appointmentId, { now, timezoneOffset }) {
  const result = await withTransaction(async (tx) => {
    const appointment = await Appointment.findByIdForUpdate(appointmentId, tx);
    if (!appointment) throw HttpError.notFound(`Appointment ${appointmentId} not found`);

    if (appointment.status === 'CANCELLED') {
      throw HttpError.conflict(`Appointment ${appointmentId} is already cancelled`);
    }

    const appointmentAt = parseClinicDateTime(appointment.appt_datetime, timezoneOffset);
    if (appointmentAt.getTime() <= now.getTime()) {
      throw HttpError.unprocessable(
        `Appointment ${appointmentId} at ${appointment.appt_datetime} has already started or passed`,
      );
    }

    const refund = calculateRefund(appointment.amount_paid, appointmentAt, now);
    await Appointment.markCancelled(
      {
        appointmentId,
        cancelledAt: formatClinicDateTime(now, timezoneOffset),
        refundAmount: refund.refundAmount,
      },
      tx,
    );

    return {
      appointment: await Appointment.findById(appointmentId, tx),
      refund: {
        notice_hours: Math.round(refund.noticeHours * 100) / 100,
        refund_percent: refund.refundPercent,
        amount_paid: appointment.amount_paid,
        refund_amount: refund.refundAmount,
      },
    };
  });

  // Only reached after COMMIT. Not awaited: logging must never slow down or fail the cancellation.
  auditLog.logEvent('APPOINTMENT_CANCELLED', {
    appointment_id: appointmentId,
    patient_id: result.appointment.patient_id,
    doctor_id: result.appointment.doctor_id,
    appt_datetime: result.appointment.appt_datetime,
    cancelled_at: result.appointment.cancelled_at,
    ...result.refund,
  });

  return result;
}

module.exports = { cancelAppointment };
