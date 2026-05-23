require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const requestLogger = require('./middlewares/requestLogger');

const app = express();

app.use(cors({ origin: '*', credentials: true }));
// Si usas el método nativo de Express moderno:
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
//
app.use(requestLogger);

// Endpoint público requerido por el profe
app.get('/authors', (req, res) => {
  res.json([
    { nombre: 'Yum', codigo: '0000325678' },
    { nombre: 'Camal', codigo: '0000360871' },
    { nombre: 'Gualter', codigo: '0000345843' },
  ]);
});

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

app.use('/api', require('./routes/index'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

module.exports = app;