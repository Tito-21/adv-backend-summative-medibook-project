const { validateAppointmentSlot } = require('../src/validators/slotValidator');

// "Now" is fixed: 1 Dec 2026, 08:00 clinic time (UTC+03:00).
const OPTIONS = {
  now: new Date('2026-12-01T08:00:00+03:00'),
  timezoneOffset: '+03:00',
};

const validate = (input) => validateAppointmentSlot(input, OPTIONS);

describe('validateAppointmentSlot - valid slots', () => {
  test('accepts a future slot on a half-hour boundary', () => {
    const result = validate('2026-12-02T10:30');
    expect(result.errors).toEqual([]);
    expect(result.slot).toMatchObject({ dbValue: '2026-12-02 10:30:00', date: '2026-12-02' });
  });

  test('accepts the first slot of the day (09:00)', () => {
    expect(validate('2026-12-02T09:00').errors).toEqual([]);
  });

  test('accepts the last slot of the day (16:30, ends at 17:00)', () => {
    expect(validate('2026-12-02T16:30').errors).toEqual([]);
  });

  test('accepts a space separator and explicit :00 seconds', () => {
    expect(validate('2026-12-02 11:00:00').errors).toEqual([]);
  });
});

describe('validateAppointmentSlot - rule violations (422)', () => {
  test('rejects 17:00 because the slot would end after closing', () => {
    const result = validate('2026-12-02T17:00');
    expect(result.isFormatError).toBe(false);
    expect(result.errors).toEqual([expect.stringMatching(/working hours/)]);
  });

  test('rejects 08:30, before opening', () => {
    expect(validate('2026-12-02T08:30').errors).toEqual([expect.stringMatching(/working hours/)]);
  });

  test('rejects 09:15, not on a 30-minute boundary', () => {
    expect(validate('2026-12-02T09:15').errors).toEqual([expect.stringMatching(/30-minute boundary/)]);
  });

  test('rejects non-zero seconds (09:00:30)', () => {
    expect(validate('2026-12-02T09:00:30').errors).toEqual([expect.stringMatching(/30-minute boundary/)]);
  });

  test('rejects a slot in the past', () => {
    expect(validate('2026-11-30T10:00').errors).toEqual([expect.stringMatching(/future/)]);
  });

  test('edge case: rejects a slot earlier today that has already passed', () => {
    const laterNow = { ...OPTIONS, now: new Date('2026-12-01T12:10:00+03:00') };
    const result = validateAppointmentSlot('2026-12-01T12:00', laterNow);
    expect(result.errors).toEqual([expect.stringMatching(/future/)]);
  });

  test('uses the clinic time zone: 09:00 local is in the past at 06:30 UTC (09:30 local)', () => {
    const utcNow = { ...OPTIONS, now: new Date('2026-12-01T06:30:00Z') };
    expect(validateAppointmentSlot('2026-12-01T09:00', utcNow).errors)
      .toEqual([expect.stringMatching(/future/)]);
    expect(validateAppointmentSlot('2026-12-01T10:00', utcNow).errors).toEqual([]);
  });

  test('reports every broken rule at once', () => {
    expect(validate('2026-11-01T18:15').errors).toHaveLength(3);
  });
});

describe('validateAppointmentSlot - malformed input (400)', () => {
  test.each([
    ['plain words', 'tomorrow'],
    ['missing time', '2026-12-02'],
    ['impossible date', '2026-02-30T10:00'],
    ['impossible time', '2026-12-02T25:00'],
    ['not a string', 20261202],
    ['empty string', ''],
  ])('rejects %s as a format error', (label, input) => {
    const result = validate(input);
    expect(result.isFormatError).toBe(true);
    expect(result.errors).toHaveLength(1);
  });
});
