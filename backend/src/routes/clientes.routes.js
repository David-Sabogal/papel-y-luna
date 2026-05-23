const { Router } = require('express');
const ctrl = require('../controllers/clientes.controller');
const authJwt = require('../middlewares/authJwt');

const router = Router();

router.get('/',              authJwt, ctrl.list);
router.get('/:id',           authJwt, ctrl.show);
router.get('/:id/saldoDebe', authJwt, ctrl.saldo);
router.post('/',             authJwt, ctrl.create);
router.put('/:id',           authJwt, ctrl.update);
router.delete('/:id',        authJwt, ctrl.destroy);

module.exports = router;