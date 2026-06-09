const { Router } = require('express');
const ctrl    = require('../controllers/finanzas.controller');
const authJwt  = require('../middlewares/authJwt');
const requireRole = require('../middlewares/requireRole');

const router = Router();

router.get('/dashboard',  authJwt, requireRole('ADMIN'), ctrl.dashboard);
router.get('/gastos',     authJwt, requireRole('ADMIN'), ctrl.listGastos);
router.post('/gastos',    authJwt, requireRole('ADMIN'), ctrl.createGasto);
router.delete('/gastos/:id', authJwt, requireRole('ADMIN'), ctrl.deleteGasto);
router.get('/capital',    authJwt, requireRole('ADMIN'), ctrl.listCapital);
router.post('/capital',   authJwt, requireRole('ADMIN'), ctrl.createCapital);

// Gastos por producto/vehículo
router.get('/productos/:productoId/gastos',  authJwt, requireRole('ADMIN'), ctrl.listGastosProducto);
router.post('/productos/:productoId/gastos', authJwt, requireRole('ADMIN'), ctrl.createGastoProducto);

module.exports = router;