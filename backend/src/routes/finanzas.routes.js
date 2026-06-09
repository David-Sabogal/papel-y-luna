const { Router } = require('express');
const ctrl    = require('../controllers/finanzas.controller');
const authJwt  = require('../middlewares/authJwt');
const requireRole = require('../middlewares/requireRole');

const router = Router();

router.get('/dashboard',  authJwt, requireRole('ADMIN'), ctrl.dashboard);
// Gastos por vehículos general (Antes del ID para evitar conflicto de parámetros)
router.get('/gastos/vehiculos', authJwt, requireRole('ADMIN'), ctrl.listGastosVehiculos);

// Gastos Administrativos
router.get('/gastos',     authJwt, requireRole('ADMIN'), ctrl.listGastos);
router.post('/gastos',    authJwt, requireRole('ADMIN'), ctrl.createGasto);


// Rutas con parámetros dinámicos (:id)
router.delete('/gastos/:id', authJwt, requireRole('ADMIN'), ctrl.deleteGasto);

// Capital
router.get('/capital',    authJwt, requireRole('ADMIN'), ctrl.listCapital);
router.post('/capital',   authJwt, requireRole('ADMIN'), ctrl.createCapital);

// Gastos por producto/vehículo específico
router.get('/productos/:productoId/gastos',  authJwt, requireRole('ADMIN'), ctrl.listGastosProducto);
router.post('/productos/:productoId/gastos', authJwt, requireRole('ADMIN'), ctrl.createGastoProducto);

module.exports = router;