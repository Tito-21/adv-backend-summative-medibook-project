// Pure validation helpers: no database or HTTP code, so they are unit-testable.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9][0-9 -]{6,18}$/;
const MONEY_PATTERN = /^\d{1,6}(\.\d{1,2})?$/; // fits DECIMAL(8,2)

const typeCheckers = {
  string: (value) => typeof value === 'string' && value.trim() !== '',
  email: (value) => typeof value === 'string' && EMAIL_PATTERN.test(value.trim()),
  phone: (value) => typeof value === 'string' && PHONE_PATTERN.test(value.trim()),
  money: (value) =>
    (typeof value === 'number' || typeof value === 'string') && MONEY_PATTERN.test(String(value)),
};

const typeMessages = {
  string: 'must be a non-empty string',
  email: 'must be a valid email address',
  phone: 'must be a valid phone number (digits, spaces, dashes, optional leading +)',
  money: 'must be an amount from 0 to 999999.99 with at most 2 decimal places',
};

function normalize(type, value) {
  if (type === 'money') return Number(value);
  if (type === 'email') return value.trim().toLowerCase();
  return value.trim();
}

/**
 * Validates a request body against a set of field rules.
 * rules: { fieldName: { type, maxLength? } }
 * partial: true for updates (only fields that are present are checked).
 * Returns { errors: string[], data: object } where data holds the cleaned values.
 */
function validateFields(body, rules, { partial = false } = {}) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: ['Request body must be a JSON object'], data: {} };
  }

  const errors = [];
  const data = {};

  for (const field of Object.keys(body)) {
    if (!rules[field]) errors.push(`Unknown field: ${field}`);
  }

  for (const [field, rule] of Object.entries(rules)) {
    const value = body[field];

    if (value === undefined || value === null) {
      if (!partial) errors.push(`${field} is required`);
      continue;
    }
    if (!typeCheckers[rule.type](value)) {
      errors.push(`${field} ${typeMessages[rule.type]}`);
      continue;
    }

    const cleaned = normalize(rule.type, value);
    if (rule.maxLength && String(cleaned).length > rule.maxLength) {
      errors.push(`${field} must be at most ${rule.maxLength} characters`);
      continue;
    }
    data[field] = cleaned;
  }

  if (partial && errors.length === 0 && Object.keys(data).length === 0) {
    errors.push(`Provide at least one of: ${Object.keys(rules).join(', ')}`);
  }

  return { errors, data };
}

/** Parses a route id parameter. Returns a positive integer, or null if invalid. */
function parseId(value) {
  if (!/^\d+$/.test(String(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

module.exports = { validateFields, parseId };
