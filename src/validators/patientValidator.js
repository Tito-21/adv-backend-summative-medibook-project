const { validateFields } = require('./fieldValidator');

const PATIENT_RULES = {
  full_name: { type: 'string', maxLength: 100 },
  email: { type: 'email', maxLength: 255 },
  phone: { type: 'phone', maxLength: 20 },
};

function validateNewPatient(body) {
  return validateFields(body, PATIENT_RULES);
}

function validatePatientUpdate(body) {
  return validateFields(body, PATIENT_RULES, { partial: true });
}

module.exports = { validateNewPatient, validatePatientUpdate };
