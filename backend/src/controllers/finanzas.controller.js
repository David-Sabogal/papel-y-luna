const { Venta, Compra, Gasto, Capital, Producto } = require('../models');
const { Op } = require('sequelize');

// Helper: agrupar por mes en JS (evita DATE_TRUNC que falla en SQLite)
function mesKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

exports.dashboard = async (req, res, next) => {
  try {
    // KPIs globales
    const ventas   = await Venta.findAll({ where: { estado: 'cerrada' }, attributes: ['total', 'createdAt'] });
    const compras  = await Compra.findAll({ attributes: ['total', 'createdAt'] });
    const gastos   = await Gasto.findAll({ attributes: ['monto', 'fecha'] });
    const capitals = await Capital.findAll({ attributes: ['monto'] });

    const totalVentas  = ventas.reduce((s, v) => s + (v.total || 0), 0);
    const totalCompras = compras.reduce((s, c) => s + (c.total || 0), 0);
    const totalGastos  = gastos.reduce((s, g) => s + (g.monto || 0), 0);
    const totalCapital = capitals.reduce((s, c) => s + (c.monto || 0), 0);

    const totalEgresos  = totalCompras + totalGastos;
    const valorNetoCaja = totalVentas - totalEgresos;
    const recuperacion  = totalCapital - valorNetoCaja;

    // Agrupar por mes en JS
    const porMes = {};

    for (const v of ventas) {
      const k = mesKey(v.createdAt);
      if (!porMes[k]) porMes[k] = { ingresos: 0, compras: 0, gastos: 0 };
      porMes[k].ingresos += v.total || 0;
    }
    for (const c of compras) {
      const k = mesKey(c.createdAt);
      if (!porMes[k]) porMes[k] = { ingresos: 0, compras: 0, gastos: 0 };
      porMes[k].compras += c.total || 0;
    }
    for (const g of gastos) {
      const k = mesKey(g.fecha);
      if (!porMes[k]) porMes[k] = { ingresos: 0, compras: 0, gastos: 0 };
      porMes[k].gastos += g.monto || 0;
    }

    let acumulado = -totalCapital;
    const flujoMensual = Object.keys(porMes).sort().map(mes => {
      const { ingresos, compras: c, gastos: g } = porMes[mes];
      const egresos   = c + g;
      const flujoNeto = ingresos - egresos;
      acumulado += flujoNeto;
      return {
        mes,
        ingresos:  parseFloat(ingresos.toFixed(2)),
        compras:   parseFloat(c.toFixed(2)),
        gastos:    parseFloat(g.toFixed(2)),
        egresos:   parseFloat(egresos.toFixed(2)),
        flujoNeto: parseFloat(flujoNeto.toFixed(2)),
        acumulado: parseFloat(acumulado.toFixed(2)),
      };
    });

    res.json({
      kpis: {
        totalVentas:   parseFloat(totalVentas.toFixed(2)),
        totalCompras:  parseFloat(totalCompras.toFixed(2)),
        totalGastos:   parseFloat(totalGastos.toFixed(2)),
        totalEgresos:  parseFloat(totalEgresos.toFixed(2)),
        valorNetoCaja: parseFloat(valorNetoCaja.toFixed(2)),
        totalCapital:  parseFloat(totalCapital.toFixed(2)),
        recuperacion:  parseFloat(recuperacion.toFixed(2)),
        enPuntoEquilibrio: valorNetoCaja >= totalCapital,
      },
      flujoMensual,
    });
  } catch (err) { next(err); }
};

exports.listGastos = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.desde && req.query.hasta) {
      where.fecha = { [Op.between]: [req.query.desde, req.query.hasta] };
    }
    if (req.query.categoria) where.categoria = req.query.categoria;
    // Solo gastos generales (sin productoId) a menos que se pida filtro
    if (!req.query.productoId) where.productoId = null;
    const g = await Gasto.findAll({ where, order: [['fecha', 'DESC'], ['createdAt', 'DESC']] });
    res.json(g);
  } catch (err) { next(err); }
};

exports.createGasto = async (req, res, next) => {
  try {
    const { descripcion, categoria, monto, fecha } = req.body;
    if (!descripcion || !monto || !fecha) {
      return res.status(400).json({ error: 'descripcion, monto y fecha son requeridos' });
    }
    const g = await Gasto.create({
      descripcion, categoria: categoria || 'otro',
      monto: parseFloat(monto), fecha,
      productoId: null,
      usuarioId: req.user?.sub || null,
    });
    res.status(201).json(g);
  } catch (err) { next(err); }
};

exports.deleteGasto = async (req, res, next) => {
  try {
    const g = await Gasto.findByPk(req.params.id);
    if (!g) return res.status(404).json({ error: 'Gasto no encontrado' });
    await g.destroy();
    res.status(204).send();
  } catch (err) { next(err); }
};

exports.listCapital = async (req, res, next) => {
  try {
    const c = await Capital.findAll({ order: [['fecha', 'ASC']] });
    res.json(c);
  } catch (err) { next(err); }
};

exports.createCapital = async (req, res, next) => {
  try {
    const { descripcion, monto, fecha, tipo } = req.body;
    if (!descripcion || !monto || !fecha) {
      return res.status(400).json({ error: 'descripcion, monto y fecha son requeridos' });
    }
    const c = await Capital.create({
      descripcion, monto: parseFloat(monto),
      fecha, tipo: tipo || 'aporte',
      usuarioId: req.user?.sub || null,
    });
    res.status(201).json(c);
  } catch (err) { next(err); }
};

// Gastos por producto/vehículo
exports.listGastosProducto = async (req, res, next) => {
  try {
    const g = await Gasto.findAll({
      where: { productoId: parseInt(req.params.productoId) },
      order: [['fecha', 'DESC']],
    });
    res.json(g);
  } catch (err) { next(err); }
};

exports.createGastoProducto = async (req, res, next) => {
  try {
    const { descripcion, categoria, monto, fecha } = req.body;
    if (!descripcion || !monto || !fecha) {
      return res.status(400).json({ error: 'descripcion, monto y fecha son requeridos' });
    }
    const g = await Gasto.create({
      descripcion, categoria: categoria || 'otro',
      monto: parseFloat(monto), fecha,
      productoId: parseInt(req.params.productoId),
      usuarioId: req.user?.sub || null,
    });
    res.status(201).json(g);
  } catch (err) { next(err); }
};