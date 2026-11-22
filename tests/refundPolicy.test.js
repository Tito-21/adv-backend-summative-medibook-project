const { calculateRefund, refundPercentFor } = require('../src/services/refundPolicy');

// Fixed appointment time; cancellation times are built relative to it.
const APPOINTMENT_AT = new Date('2026-12-10T10:00:00Z');
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

function cancelledBefore(ms) {
  return new Date(APPOINTMENT_AT.getTime() - ms);
}

describe('calculateRefund', () => {
  test('more than 48 hours notice gives a 100% refund', () => {
    const result = calculateRefund(150, APPOINTMENT_AT, cancelledBefore(72 * HOUR_MS));
    expect(result).toMatchObject({ refundPercent: 100, refundAmount: 150, noticeHours: 72 });
  });

  test('one minute more than 48 hours still gives 100%', () => {
    const result = calculateRefund(150, APPOINTMENT_AT, cancelledBefore(48 * HOUR_MS + MINUTE_MS));
    expect(result.refundPercent).toBe(100);
  });

  test('exactly 48 hours notice is NOT "more than 48", so it gives 50%', () => {
    const result = calculateRefund(150, APPOINTMENT_AT, cancelledBefore(48 * HOUR_MS));
    expect(result).toMatchObject({ refundPercent: 50, refundAmount: 75, noticeHours: 48 });
  });

  test('between 24 and 48 hours notice gives a 50% refund', () => {
    const result = calculateRefund(100, APPOINTMENT_AT, cancelledBefore(36 * HOUR_MS));
    expect(result).toMatchObject({ refundPercent: 50, refundAmount: 50 });
  });

  test('exactly 24 hours notice is inside the 24-48 band, so it gives 50%', () => {
    const result = calculateRefund(150, APPOINTMENT_AT, cancelledBefore(24 * HOUR_MS));
    expect(result).toMatchObject({ refundPercent: 50, refundAmount: 75, noticeHours: 24 });
  });

  test('one minute less than 24 hours gives no refund', () => {
    const result = calculateRefund(150, APPOINTMENT_AT, cancelledBefore(24 * HOUR_MS - MINUTE_MS));
    expect(result).toMatchObject({ refundPercent: 0, refundAmount: 0 });
  });

  test('less than 24 hours notice gives a 0% refund', () => {
    const result = calculateRefund(200, APPOINTMENT_AT, cancelledBefore(2 * HOUR_MS));
    expect(result).toMatchObject({ refundPercent: 0, refundAmount: 0 });
  });

  test('rounds half a cent up instead of losing it to floating point (50% of 120.55)', () => {
    const result = calculateRefund(120.55, APPOINTMENT_AT, cancelledBefore(30 * HOUR_MS));
    expect(result.refundAmount).toBe(60.28);
  });
});

describe('refundPercentFor', () => {
  test.each([
    [100, 100],
    [48.0001, 100],
    [48, 50],
    [30, 50],
    [24, 50],
    [23.9999, 0],
    [0, 0],
    [-5, 0],
  ])('%p hours of notice -> %p%%', (hours, expected) => {
    expect(refundPercentFor(hours)).toBe(expected);
  });
});
