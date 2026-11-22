const Doctor = require('../models/doctorModel');
const HttpError = require('../utils/HttpError');
const { requireIdParam, assertValid } = require('../utils/requestHelpers');
const { validateNewDoctor, validateDoctorUpdate } = require('../validators/doctorValidator');

async function listDoctors(req, res) {
  res.json(await Doctor.findAll());
}

async function getDoctor(req, res) {
  const doctorId = requireIdParam(req, 'Doctor');
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) throw HttpError.notFound(`Doctor ${doctorId} not found`);
  res.json(doctor);
}

async function createDoctor(req, res) {
  const { errors, data } = validateNewDoctor(req.body);
  assertValid(errors, 'Invalid doctor data');

  const doctor = await Doctor.create(data);
  res.status(201).location(`/api/doctors/${doctor.doctor_id}`).json(doctor);
}

async function updateDoctor(req, res) {
  const doctorId = requireIdParam(req, 'Doctor');
  const { errors, data } = validateDoctorUpdate(req.body);
  assertValid(errors, 'Invalid doctor data');

  const doctor = await Doctor.update(doctorId, data);
  if (!doctor) throw HttpError.notFound(`Doctor ${doctorId} not found`);
  res.json(doctor);
}

async function deleteDoctor(req, res) {
  const doctorId = requireIdParam(req, 'Doctor');
  const deleted = await Doctor.remove(doctorId);
  if (!deleted) throw HttpError.notFound(`Doctor ${doctorId} not found`);
  res.status(204).end();
}

module.exports = { listDoctors, getDoctor, createDoctor, updateDoctor, deleteDoctor };
