const { Router } = require('express');
const ctrl = require('../controllers/compras.controller');
const authJwt = require('../middlewares/authJwt');
const requireRole = require('../middlewares/requireRole');

const router = Router();

router.get('/',    authJwt, requireRole('ADMIN'), ctrl.list);
router.get('/:id', authJwt, requireRole('ADMIN'), ctrl.show);
router.post('/',   authJwt, requireRole('ADMIN'), ctrl.create);

module.exports = router;