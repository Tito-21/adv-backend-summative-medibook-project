const { classifyPromotionError, PROMOTION_OUTCOME } = require('../src/services/promotionOutcome');
const HttpError = require('../src/utils/HttpError');

describe('classifyPromotionError', () => {
  test('slot taken by a direct booking in the meantime -> SLOT_GONE (patient back to front, stop)', () => {
    const error = HttpError.conflict('taken', { reason: 'SLOT_TAKEN' });
    expect(classifyPromotionError(error)).toBe(PROMOTION_OUTCOME.SLOT_GONE);
  });

  test('day filled up in the meantime -> SLOT_GONE', () => {
    const error = HttpError.conflict('full', { reason: 'DAY_FULL' });
    expect(classifyPromotionError(error)).toBe(PROMOTION_OUTCOME.SLOT_GONE);
  });

  test('patient already busy at that time -> SKIP_PATIENT (keeps their place, next patient tried)', () => {
    expect(classifyPromotionError(HttpError.conflict('busy'))).toBe(PROMOTION_OUTCOME.SKIP_PATIENT);
  });

  test('patient no longer exists -> DROP_ENTRY', () => {
    expect(classifyPromotionError(HttpError.notFound('gone'))).toBe(PROMOTION_OUTCOME.DROP_ENTRY);
  });

  test('slot no longer bookable (e.g. now in the past) -> SLOT_GONE', () => {
    expect(classifyPromotionError(HttpError.unprocessable('past'))).toBe(PROMOTION_OUTCOME.SLOT_GONE);
  });

  test.each([
    ['database connection lost', Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })],
    ['deadlock', Object.assign(new Error('Deadlock found'), { code: 'ER_LOCK_DEADLOCK' })],
    ['unexpected value', undefined],
  ])('%s -> RETRY (patient back to front, job retried)', (label, error) => {
    expect(classifyPromotionError(error)).toBe(PROMOTION_OUTCOME.RETRY);
  });
});
