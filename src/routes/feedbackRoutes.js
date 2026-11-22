const express = require('express');
const controller = require('../controllers/feedbackController');

const router = express.Router();

router.route('/')
  .get(controller.showFeedbackForm)
  .post(express.urlencoded({ extended: false }), controller.submitFeedback);

module.exports = router;
