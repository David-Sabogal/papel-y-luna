const { Router } = require('express');
const ctrl = require('../controllers/usuarios.controller');
const authJwt = require('../middlewares/authJwt');
const requireRole = require('../middlewares/requireRole');

const router = Router();

// Solo ADMIN
router.get('/',           authJwt, requireRole('ADMIN'), ctrl.list);
router.get('/:id',        authJwt, requireRole('ADMIN'), ctrl.show);
router.patch('/:id/role', authJwt, requireRole('ADMIN'), ctrl.updateRole);
router.delete('/:id',     authJwt, requireRole('ADMIN'), ctrl.destroy);

module.exports = router;