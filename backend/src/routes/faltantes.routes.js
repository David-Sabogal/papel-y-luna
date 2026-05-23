const { Router } = require('express');
const ctrl = require('../controllers/faltantes.controller');
const authJwt = require('../middlewares/authJwt');

const router = Router();

router.get('/',              authJwt, ctrl.list);
router.get('/reporte',       authJwt, ctrl.reporte);
router.post('/',             authJwt, ctrl.create);
router.patch('/:id/estado',  authJwt, ctrl.updateEstado);

module.exports = router;