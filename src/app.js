const express = require('express');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const waitlistRoutes = require('./routes/waitlistRoutes');
const reportRoutes = require('./routes/reportRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'MediBook API',
    endpoints: [
      'GET|POST /api/patients',
      'GET|PATCH|DELETE /api/patients/:id',
      'GET|POST /api/doctors',
      'GET|PATCH|DELETE /api/doctors/:id',
      'GET /api/doctors/:id/stats',
      'POST /api/appointments',
      'GET|DELETE /api/appointments/:id',
      'GET /api/waitlist?doctor_id=&date=',
      'POST /api/waitlist',
      'GET /api/reports/doctors',
      'GET /api/reports/busy-days',
    ],
  });
});

app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/reports', reportRoutes);
app.use('/feedback', feedbackRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
