const { Venta, Compra, Gasto, Capital, sequelize } = require('../models');
const { Op } = require('sequelize');

// ── Dashboard principal ───────────────────────────────────────────
exports.dashboard = async (req, res, next) => {
  try {
    const { desde, hasta } = req.query;
    const rangoWhere = {};
    if (desde && hasta) {
      rangoWhere.createdAt = {
        [Op.between]: [new Date(desde), new Date(hasta + 'T23:59:59')],
      };
    }

    // Totales globales (sin filtro de fecha para KPIs)
    const [totalVentas, totalCompras, totalGastos, totalCapital] = await Promise.all([
      Venta.sum('total',  { where: { estado: 'cerrada' } }) || 0,
      Compra.sum('total') || 0,
      Gasto.sum('monto')  || 0,
      Capital.sum('monto') || 0,
    ]);

    const valorNetoCaja   = totalVentas - (totalCompras + totalGastos);
    const totalEgresos    = totalCompras + totalGastos;
    const recuperacion    = totalCapital - valorNetoCaja;

    // Flujo mensual para gráficos (últimos 12 meses)
    const hace12 = new Date();
    hace12.setMonth(hace12.getMonth() - 11);
    hace12.setDate(1);

    const [ventasMes, comprasMes, gastosMes] = await Promise.all([
      Venta.findAll({
        attributes: [
          [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt')), 'mes'],
          [sequelize.fn('SUM', sequelize.col('total')), 'total'],
        ],
        where: { estado: 'cerrada', createdAt: { [Op.gte]: hace12 } },
        group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt'))],
        order:  [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt')), 'ASC']],
        raw: true,
      }),
      Compra.findAll({
        attributes: [
          [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt')), 'mes'],
          [sequelize.fn('SUM', sequelize.col('total')), 'total'],
        ],
        where: { createdAt: { [Op.gte]: hace12 } },
        group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt'))],
        order:  [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt')), 'ASC']],
        raw: true,
      }),
      Gasto.findAll({
        attributes: [
          [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('fecha')), 'mes'],
          [sequelize.fn('SUM', sequelize.col('monto')), 'total'],
        ],
        where: { fecha: { [Op.gte]: hace12 } },
        group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('fecha'))],
        order:  [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('fecha')), 'ASC']],
        raw: true,
      }),
    ]);

    // Construir tabla mensual unificada
    const mesesSet = new Set();
    [...ventasMes, ...comprasMes, ...gastosMes].forEach(r => {
      if (r.mes) mesesSet.add(r.mes.toString().substring(0, 7));
    });
    const meses = Array.from(mesesSet).sort();

    let acumulado = -totalCapital;
    const flujoMensual = meses.map(mes => {
      const ingresos  = parseFloat(ventasMes.find(r => r.mes?.toString().substring(0,7) === mes)?.total || 0);
      const compras   = parseFloat(comprasMes.find(r => r.mes?.toString().substring(0,7) === mes)?.total || 0);
      const gastos    = parseFloat(gastosMes.find(r => r.mes?.toString().substring(0,7) === mes)?.total || 0);
      const egresos   = compras + gastos;
      const flujoNeto = ingresos - egresos;
      acumulado      += flujoNeto;

      return {
        mes,
        ingresos:  parseFloat(ingresos.toFixed(2)),
        compras:   parseFloat(compras.toFixed(2)),
        gastos:    parseFloat(gastos.toFixed(2)),
        egresos:   parseFloat(egresos.toFixed(2)),
        flujoNeto: parseFloat(flujoNeto.toFixed(2)),
        acumulado: parseFloat(acumulado.toFixed(2)),
      };
    });

    res.json({
      kpis: {
        totalVentas:   parseFloat((totalVentas || 0).toFixed(2)),
        totalCompras:  parseFloat((totalCompras || 0).toFixed(2)),
        totalGastos:   parseFloat((totalGastos || 0).toFixed(2)),
        totalEgresos:  parseFloat(totalEgresos.toFixed(2)),
        valorNetoCaja: parseFloat(valorNetoCaja.toFixed(2)),
        totalCapital:  parseFloat((totalCapital || 0).toFixed(2)),
        recuperacion:  parseFloat(recuperacion.toFixed(2)),
        enPuntoEquilibrio: valorNetoCaja >= totalCapital,
      },
      flujoMensual,
    });
  } catch (err) { next(err); }
};

// ── Gastos ────────────────────────────────────────────────────────
exports.listGastos = async (req, res, next) => {
  try {
    const where = {};
    const { Op } = require('sequelize');
    if (req.query.desde && req.query.hasta) {
      where.fecha = { [Op.between]: [req.query.desde, req.query.hasta] };
    }
    if (req.query.categoria) where.categoria = req.query.categoria;
    const gastos = await Gasto.findAll({ where, order: [['fecha', 'DESC'], ['createdAt', 'DESC']] });
    res.json(gastos);
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

// ── Capital ───────────────────────────────────────────────────────
exports.listCapital = async (req, res, next) => {
  try {
    const aportes = await Capital.findAll({ order: [['fecha', 'ASC']] });
    res.json(aportes);
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