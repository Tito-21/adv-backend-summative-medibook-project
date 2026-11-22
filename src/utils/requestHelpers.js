const HttpError = require('./HttpError');
const { parseId } = require('../validators/fieldValidator');

/** Reads req.params.id as a positive integer or throws a 400. */
function requireIdParam(req, resourceName) {
  const id = parseId(req.params.id);
  if (!id) throw HttpError.badRequest(`${resourceName} id must be a positive integer`);
  return id;
}

/** Throws a 400 listing every validation error, if there are any. */
function assertValid(errors, message) {
  if (errors.length) throw HttpError.badRequest(message, errors);
}

module.exports = { requireIdParam, assertValid };
