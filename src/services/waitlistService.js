const Appointment = require('../models/appointmentModel');
const Doctor = require('../models/doctorModel');
const Patient = require('../models/patientModel');
const Waitlist = require('../queues/waitlistQueue');
const jobQueue = require('../queues/jobQueue');
const { QUEUES, WAITLIST_SCOPE, slotWaitlistKey, dayWaitlistKey } = require('../queues/keys');
const HttpError = require('../utils/HttpError');
const auditLog = require('../utils/auditLogger');
const config = require('../config/env');
const { MAX_APPOINTMENTS_PER_DAY } = require('../config/businessRules');
const { parseClinicDateTime } = require('../utils/clinicTime');
const { validateAppointmentSlot } = require('../validators/slotValidator');
const { bookAppointment } = require('./bookingService');
const { PROMOTION_OUTCOME, classifyPromotionError } = require('./promotionOutcome');

/**
 * Adds a patient to a waitlist when the requested slot or day is full.
 * Slot taken (day not full) -> waits for that exact slot.
 * Day full                  -> waits for any slot freed that day.
 */
async function joinWaitlist({ patientId, doctorId, slot }) {
  const [doctor, patient] = await Promise.all([
    Doctor.findById(doctorId),
    Patient.findById(patientId),
  ]);
  if (!doctor) throw HttpError.notFound(`Doctor ${doctorId} not found`);
  if (!patient) throw HttpError.notFound(`Patient ${patientId} not found`);

  const slotTaken = await Appointment.isDoctorSlotTaken(doctorId, slot.dbValue);
  const dayFull =
    (await Appointment.countActiveForDoctorOnDate(doctorId, slot.date)) >= MAX_APPOINTMENTS_PER_DAY;
  if (!slotTaken && !dayFull) {
    throw HttpError.conflict('This slot is available: book it directly with POST /api/appointments');
  }

  const scope = dayFull ? WAITLIST_SCOPE.DAY : WAITLIST_SCOPE.SLOT;
  const entry = {
    scope,
    patient_id: patientId,
    doctor_id: doctorId,
    date: slot.date,
    appt_datetime: scope === WAITLIST_SCOPE.SLOT ? slot.dbValue : null,
  };
  // A slot waitlist is useless once the slot starts; a day waitlist once the day ends.
  const expiresAt =
    scope === WAITLIST_SCOPE.SLOT
      ? slot.at
      : parseClinicDateTime(`${slot.date} 23:59:59`, config.db.timezone);

  const position = await Waitlist.join(entry, expiresAt);
  if (position === null) {
    throw HttpError.conflict(`Patient ${patientId} is already on this waitlist`);
  }

  auditLog.logEvent('WAITLIST_JOINED', { ...entry, position });
  return { ...entry, position };
}

async function getWaitlist(doctorId, date) {
  const slotKeys = await Waitlist.findKeys(`waitlist:slot:${doctorId}:${date} *`);
  const slotWaitlists = await Promise.all(
    slotKeys.map(async (key) => ({
      appt_datetime: key.slice(`waitlist:slot:${doctorId}:`.length),
      patient_ids: (await Waitlist.list(key)).map((entry) => entry.patient_id),
    })),
  );

  return {
    doctor_id: doctorId,
    date,
    any_slot_that_day: (await Waitlist.list(dayWaitlistKey(doctorId, date))).map(
      (entry) => entry.patient_id,
    ),
    specific_slots: slotWaitlists,
  };
}

/**
 * Called after a cancellation commits. Queues a job for the worker; a Redis
 * failure is logged but never fails the (already committed) cancellation.
 */
async function notifySlotFreed({ doctor_id, appt_datetime }) {
  try {
    await jobQueue.enqueue(QUEUES.PROMOTIONS, { doctor_id, appt_datetime });
  } catch (error) {
    console.error(`Could not notify waitlist for doctor ${doctor_id} at ${appt_datetime}: ${error.message}`);
    auditLog.logEvent('WAITLIST_NOTIFY_FAILED', { doctor_id, appt_datetime, error: error.message });
  }
}

/**
 * Worker handler: books the first eligible waitlisted patient into a freed slot.
 * Patients waiting for that exact slot go first, then those waiting for any
 * slot that day. Each patient is moved (not popped) to a processing list while
 * we try to book them, so they can never be lost:
 *   booked        -> removed from processing
 *   SKIP_PATIENT  -> kept aside, restored to the front (in order) at the end
 *   SLOT_GONE     -> back to the front, stop
 *   RETRY         -> back to the front, throw so the job is retried
 */
async function promoteForFreedSlot({ doctor_id: doctorId, appt_datetime: apptDatetime }, { now }) {
  const { errors, slot } = validateAppointmentSlot(apptDatetime, {
    now,
    timezoneOffset: config.db.timezone,
  });
  if (errors.length) return { promoted: false, reason: 'SLOT_NO_LONGER_BOOKABLE' };

  const candidateKeys = [slotWaitlistKey(doctorId, slot.dbValue), dayWaitlistKey(doctorId, slot.date)];
  const skipped = [];

  try {
    for (const key of candidateKeys) {
      for (let taken = await Waitlist.takeNext(key); taken; taken = await Waitlist.takeNext(key)) {
        const { entry } = taken;
        try {
          const appointment = await bookAppointment({ patientId: entry.patient_id, doctorId, slot });
          await Waitlist.complete(taken);
          auditLog.logEvent('WAITLIST_PROMOTED', {
            appointment_id: appointment.appointment_id,
            patient_id: entry.patient_id,
            doctor_id: doctorId,
            appt_datetime: slot.dbValue,
            from_waitlist: entry.scope,
          });
          return { promoted: true, appointment };
        } catch (error) {
          const outcome = classifyPromotionError(error);

          if (outcome === PROMOTION_OUTCOME.SKIP_PATIENT) {
            skipped.push(taken);
            continue;
          }
          if (outcome === PROMOTION_OUTCOME.DROP_ENTRY) {
            await Waitlist.complete(taken);
            auditLog.logEvent('WAITLIST_ENTRY_DROPPED', { ...entry, reason: error.message });
            continue;
          }

          await Waitlist.returnToFront(taken);
          if (outcome === PROMOTION_OUTCOME.RETRY) throw error;
          return { promoted: false, reason: error.details?.reason || 'SLOT_GONE' };
        }
      }
    }
    return { promoted: false, reason: 'NO_ELIGIBLE_PATIENT_WAITING' };
  } finally {
    // Skipped patients go back to the front in their original order.
    for (const taken of skipped.reverse()) await Waitlist.returnToFront(taken);
  }
}

module.exports = { joinWaitlist, getWaitlist, notifySlotFreed, promoteForFreedSlot };
