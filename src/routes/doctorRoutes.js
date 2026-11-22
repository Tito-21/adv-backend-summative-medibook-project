const express = require('express');
const controller = require('../controllers/doctorController');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.route('/')
  .get(controller.listDoctors)
  .post(controller.createDoctor);

router.route('/:id')
  .get(controller.getDoctor)
  .patch(controller.updateDoctor)
  .delete(controller.deleteDoctor);

router.get('/:id/stats', reportController.getDoctorStats);

module.exports = router;
