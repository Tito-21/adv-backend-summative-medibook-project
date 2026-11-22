const { validateFields, parseId } = require('../src/validators/fieldValidator');

const RULES = {
  full_name: { type: 'string', maxLength: 10 },
  email: { type: 'email' },
  fee: { type: 'money' },
};

describe('validateFields', () => {
  test('cleans valid input (trims names, lower-cases emails, converts money)', () => {
    const { errors, data } = validateFields(
      { full_name: '  Ama  ', email: 'AMA@Mail.com', fee: '99.50' },
      RULES,
    );
    expect(errors).toEqual([]);
    expect(data).toEqual({ full_name: 'Ama', email: 'ama@mail.com', fee: 99.5 });
  });

  test('lists every problem, including unknown and missing fields', () => {
    const { errors } = validateFields({ full_name: '', age: 30 }, RULES);
    expect(errors).toEqual([
      'Unknown field: age',
      'full_name must be a non-empty string',
      'email is required',
      'fee is required',
    ]);
  });

  test('edge case: a name of exactly maxLength passes, one more character fails', () => {
    const base = { email: 'a@b.co', fee: 1 };
    expect(validateFields({ ...base, full_name: 'x'.repeat(10) }, RULES).errors).toEqual([]);
    expect(validateFields({ ...base, full_name: 'x'.repeat(11) }, RULES).errors)
      .toEqual(['full_name must be at most 10 characters']);
  });

  test('edge case: money rejects negatives, 3 decimals and values too big for DECIMAL(8,2)', () => {
    const base = { full_name: 'Ama', email: 'a@b.co' };
    for (const fee of [-1, 10.555, 1000000]) {
      expect(validateFields({ ...base, fee }, RULES).errors).toHaveLength(1);
    }
  });

  test('partial mode only checks fields that are present but requires at least one', () => {
    expect(validateFields({ email: 'new@mail.com' }, RULES, { partial: true }).errors).toEqual([]);
    expect(validateFields({}, RULES, { partial: true }).errors).toHaveLength(1);
  });

  test('rejects a body that is not an object', () => {
    expect(validateFields([1, 2], RULES).errors).toEqual(['Request body must be a JSON object']);
  });
});

describe('parseId', () => {
  test.each([
    ['7', 7],
    ['0', null],
    ['-3', null],
    ['1.5', null],
    ['abc', null],
    ['99999999999999999999', null],
  ])('parseId(%p) -> %p', (input, expected) => {
    expect(parseId(input)).toBe(expected);
  });
});
