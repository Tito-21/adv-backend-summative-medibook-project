const express = require('express');
const controller = require('../controllers/patientController');

const router = express.Router();

router.route('/')
  .get(controller.listPatients)
  .post(controller.createPatient);

router.route('/:id')
  .get(controller.getPatient)
  .patch(controller.updatePatient)
  .delete(controller.deletePatient);

module.exports = router;
