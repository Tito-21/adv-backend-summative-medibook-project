const {
  FULL_REFUND_ABOVE_HOURS,
  PARTIAL_REFUND_FROM_HOURS,
  FULL_REFUND_PERCENT,
  PARTIAL_REFUND_PERCENT,
  NO_REFUND_PERCENT,
} = require('../config/businessRules');

const MS_PER_HOUR = 60 * 60 * 1000;

/** Hours between the cancellation and the appointment (negative if already past). */
function hoursOfNotice(appointmentAt, cancelledAt) {
  return (appointmentAt.getTime() - cancelledAt.getTime()) / MS_PER_HOUR;
}

/**
 * Refund percentage for a given notice period.
 * Boundaries: exactly 48h -> 50% (not "more than 48"); exactly 24h -> 50%.
 */
function refundPercentFor(noticeHours) {
  if (noticeHours > FULL_REFUND_ABOVE_HOURS) return FULL_REFUND_PERCENT;
  if (noticeHours >= PARTIAL_REFUND_FROM_HOURS) return PARTIAL_REFUND_PERCENT;
  return NO_REFUND_PERCENT;
}

/**
 * Computes the refund for a cancellation. Works in whole cents so results are
 * exact (e.g. 50% of 120.55 is 60.28, rounded half up).
 */
function calculateRefund(amountPaid, appointmentAt, cancelledAt) {
  const noticeHours = hoursOfNotice(appointmentAt, cancelledAt);
  const refundPercent = refundPercentFor(noticeHours);
  const paidCents = Math.round(amountPaid * 100);
  const refundCents = Math.round((paidCents * refundPercent) / 100);

  return {
    noticeHours,
    refundPercent,
    refundAmount: refundCents / 100,
  };
}

module.exports = { hoursOfNotice, refundPercentFor, calculateRefund };
