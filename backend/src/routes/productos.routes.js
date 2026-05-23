const { Router } = require('express');
const ctrl = require('../controllers/productos.controller');
const { createRules, updateRules, handleErrors } = require('../validators/producto.validator');
const authJwt = require('../middlewares/authJwt');
const requireRole = require('../middlewares/requireRole');

const router = Router();

// Públicas — cualquiera puede ver el catálogo
router.get('/',    ctrl.list);
router.get('/:id', ctrl.show);

// Protegidas — solo ADMIN puede crear, editar, borrar
router.post('/',    authJwt, requireRole('ADMIN'), createRules, handleErrors, ctrl.create);
router.put('/:id',  authJwt, requireRole('ADMIN'), updateRules, handleErrors, ctrl.update);
router.delete('/:id', authJwt, requireRole('ADMIN'), ctrl.destroy);

module.exports = router;