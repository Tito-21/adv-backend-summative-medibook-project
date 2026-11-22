const Patient = require('../models/patientModel');
const HttpError = require('../utils/HttpError');
const { parseId } = require('../validators/fieldValidator');
const { validateNewPatient, validatePatientUpdate } = require('../validators/patientValidator');

function requirePatientId(req) {
  const patientId = parseId(req.params.id);
  if (!patientId) throw HttpError.badRequest('Patient id must be a positive integer');
  return patientId;
}

async function listPatients(req, res) {
  res.json(await Patient.findAll());
}

async function getPatient(req, res) {
  const patientId = requirePatientId(req);
  const patient = await Patient.findById(patientId);
  if (!patient) throw HttpError.notFound(`Patient ${patientId} not found`);
  res.json(patient);
}

async function createPatient(req, res) {
  const { errors, data } = validateNewPatient(req.body);
  if (errors.length) throw HttpError.badRequest('Invalid patient data', errors);

  const patient = await Patient.create(data);
  res.status(201).location(`/api/patients/${patient.patient_id}`).json(patient);
}

async function updatePatient(req, res) {
  const patientId = requirePatientId(req);
  const { errors, data } = validatePatientUpdate(req.body);
  if (errors.length) throw HttpError.badRequest('Invalid patient data', errors);

  const patient = await Patient.update(patientId, data);
  if (!patient) throw HttpError.notFound(`Patient ${patientId} not found`);
  res.json(patient);
}

async function deletePatient(req, res) {
  const patientId = requirePatientId(req);
  const deleted = await Patient.remove(patientId);
  if (!deleted) throw HttpError.notFound(`Patient ${patientId} not found`);
  res.status(204).end();
}

module.exports = { listPatients, getPatient, createPatient, updatePatient, deletePatient };
