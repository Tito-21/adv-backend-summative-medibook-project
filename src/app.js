const express = require('express');
const patientRoutes = require('./routes/patientRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/patients', patientRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
