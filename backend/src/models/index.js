'use strict';
const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';
const config = require('../../config/config.js')[env];

// --- AQUÍ ESTÁ EL AJUSTE ---
let sequelize;
if (config.use_env_variable) {
  // Si estás en producción (Railway), lee la URL directamente desde process.env
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  // Si estás en desarrollo local (SQLite), lee el objeto de configuración normal
  sequelize = new Sequelize(config);
}
// ---------------------------

const db = {};

// Carga automática de todos los modelos en esta carpeta
fs.readdirSync(__dirname)
  .filter(f => f !== 'index.js' && f.endsWith('.js'))
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    db[model.name] = model;
  });

// Ejecutar asociaciones
Object.values(db).forEach(model => {
  if (model.associate) model.associate(db);
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;