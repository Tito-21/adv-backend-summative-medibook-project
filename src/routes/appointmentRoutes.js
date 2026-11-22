const express = require('express');
const controller = require('../controllers/appointmentController');

const router = express.Router();

router.post('/', controller.createAppointment);
router.get('/:id', controller.getAppointment);

module.exports = router;
