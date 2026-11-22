const { validateFields } = require('./fieldValidator');

const DOCTOR_RULES = {
  full_name: { type: 'string', maxLength: 100 },
  email: { type: 'email', maxLength: 255 },
  specialty: { type: 'string', maxLength: 100 },
  consultation_fee: { type: 'money' },
  room: { type: 'string', maxLength: 10 },
};

function validateNewDoctor(body) {
  return validateFields(body, DOCTOR_RULES);
}

function validateDoctorUpdate(body) {
  return validateFields(body, DOCTOR_RULES, { partial: true });
}

module.exports = { validateNewDoctor, validateDoctorUpdate };
