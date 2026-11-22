const HttpError = require('../utils/HttpError');

// Friendly messages for named UNIQUE constraints in database/schema.sql.
const DUPLICATE_KEY_MESSAGES = {
  uq_patients_email: 'A patient with this email already exists',
  uq_doctors_email: 'A doctor with this email already exists',
  uq_doctors_room: 'This room is already assigned to another doctor',
  uq_doctor_active_slot: 'This doctor already has an appointment at that date and time',
  uq_patient_active_slot: 'This patient already has an appointment at that date and time',
};

function duplicateKeyName(sqlMessage) {
  const match = /for key '(?:[^.']+\.)?([^']+)'/.exec(sqlMessage);
  return match ? match[1] : null;
}

// Converts known MySQL and body-parser errors into HttpErrors.
function toHttpError(error) {
  if (error instanceof HttpError) return error;

  if (error.type === 'entity.parse.failed') {
    return HttpError.badRequest('Request body is not valid JSON');
  }

  switch (error.code) {
    case 'ER_DUP_ENTRY':
      return HttpError.conflict(
        DUPLICATE_KEY_MESSAGES[duplicateKeyName(error.sqlMessage)] || 'Duplicate value',
      );
    case 'ER_ROW_IS_REFERENCED_2':
      return HttpError.conflict(
        'Cannot delete this record because it has appointment history',
      );
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
      return HttpError.unprocessable('The data breaks a business rule', [error.sqlMessage]);
    default:
      return null;
  }
}

function notFoundHandler(req, res, next) {
  next(HttpError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// Express recognises an error handler by its 4 parameters, so `next` must stay.
function errorHandler(error, req, res, next) {
  const httpError = toHttpError(error);

  if (!httpError) {
    console.error(error);
    res.status(500).json({ error: { message: 'Internal server error' } });
    return;
  }

  const body = { error: { message: httpError.message } };
  if (httpError.details) body.error.details = httpError.details;
  res.status(httpError.status).json(body);
}

module.exports = { notFoundHandler, errorHandler };
