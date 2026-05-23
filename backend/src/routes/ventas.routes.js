const { Router } = require('express');
const ctrl = require('../controllers/ventas.controller');
const reembolsoCtrl = require('../controllers/reembolsos.controller');
const { createRules, handleErrors } = require('../validators/venta.validator');
const authJwt = require('../middlewares/authJwt');
const requireRole = require('../middlewares/requireRole');

const router = Router();

router.get('/reporte', authJwt, requireRole('ADMIN'), ctrl.reporteVentas);

router.get('/',    authJwt, requireRole('USER', 'ADMIN'), ctrl.list);
router.get('/:id', authJwt, requireRole('USER', 'ADMIN'), ctrl.show);
router.post('/',   authJwt, requireRole('USER', 'ADMIN'), createRules, handleErrors, ctrl.create);

// Corregir — USER y ADMIN pueden cerrar ventas guardadas, solo ADMIN corrige cerradas
router.put('/:id/corregir',      authJwt, requireRole('USER', 'ADMIN'), ctrl.corregir);
router.patch('/:id/abono',       authJwt, requireRole('USER', 'ADMIN'), ctrl.registrarAbono);
router.patch('/:id/anular',      authJwt, requireRole('ADMIN'), ctrl.anular);

router.get('/:ventaId/reembolsos',  authJwt, requireRole('ADMIN'), reembolsoCtrl.listByVenta);
router.post('/:ventaId/reembolsos', authJwt, requireRole('ADMIN'), reembolsoCtrl.create);

module.exports = router;