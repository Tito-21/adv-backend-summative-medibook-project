const express = require('express');
const controller = require('../controllers/waitlistController');

const router = express.Router();

router.route('/')
  .get(controller.getWaitlistHandler)
  .post(controller.joinWaitlistHandler);

module.exports = router;
