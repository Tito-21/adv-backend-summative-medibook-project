const { validateBookingRequest } = require('../src/validators/bookingValidator');

const OPTIONS = {
  now: new Date('2026-12-01T08:00:00+03:00'),
  timezoneOffset: '+03:00',
};

describe('validateBookingRequest', () => {
  test('returns ids and the parsed slot for a valid request', () => {
    const result = validateBookingRequest(
      { patient_id: 1, doctor_id: 2, appt_datetime: '2026-12-02T09:30' },
      OPTIONS,
    );
    expect(result.errors).toEqual([]);
    expect(result.data).toMatchObject({
      patientId: 1,
      doctorId: 2,
      slot: { dbValue: '2026-12-02 09:30:00', date: '2026-12-02' },
    });
  });

  test('rejects a client-supplied price as an unknown field (400)', () => {
    const result = validateBookingRequest(
      { patient_id: 1, doctor_id: 2, appt_datetime: '2026-12-02T09:30', amount_paid: 1 },
      OPTIONS,
    );
    expect(result).toEqual({ status: 400, errors: ['Unknown field: amount_paid'] });
  });

  test('malformed input is a 400 even if the slot also breaks a rule', () => {
    const result = validateBookingRequest(
      { patient_id: 'one', doctor_id: 2, appt_datetime: '2026-12-02T09:15' },
      OPTIONS,
    );
    expect(result.status).toBe(400);
  });

  test('a well-formed request that breaks a slot rule is a 422', () => {
    const result = validateBookingRequest(
      { patient_id: 1, doctor_id: 2, appt_datetime: '2026-12-02T17:00' },
      OPTIONS,
    );
    expect(result.status).toBe(422);
  });
});
