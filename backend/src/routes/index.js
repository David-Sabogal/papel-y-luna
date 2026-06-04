const { Router } = require('express');
const router = Router();

router.use('/auth',        require('./auth.routes'));
router.use('/productos',   require('./productos.routes'));
router.use('/ventas',      require('./ventas.routes'));
router.use('/usuarios',    require('./usuarios.routes'));
router.use('/categorias',  require('./categorias.routes'));
router.use('/clientes',    require('./clientes.routes'));
router.use('/proveedores', require('./proveedores.routes'));
router.use('/descuentos',  require('./descuentos.routes'));
router.use('/faltantes',   require('./faltantes.routes'));
router.use('/compras',     require('./compras.routes'));
router.use('/finanzas',    require('./finanzas.routes'));

module.exports = router;