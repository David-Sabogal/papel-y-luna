const { Router } = require('express');
const ctrl = require('../controllers/descuentos.controller');
const authJwt = require('../middlewares/authJwt');
const requireRole = require('../middlewares/requireRole');

const router = Router();

router.get('/',    authJwt, ctrl.list);
router.get('/:id', authJwt, ctrl.show);
router.post('/',   authJwt, requireRole('ADMIN'), ctrl.create);
router.put('/:id', authJwt, requireRole('ADMIN'), ctrl.update);
router.delete('/:id', authJwt, requireRole('ADMIN'), ctrl.destroy);

module.exports = router;