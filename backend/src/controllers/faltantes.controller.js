const { Faltante, Producto } = require('../models');
const { Op } = require('sequelize');

exports.list = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.tipo)   where.tipo   = req.query.tipo;
    if (req.query.desde && req.query.hasta) {
      where.createdAt = { [Op.between]: [new Date(req.query.desde), new Date(req.query.hasta + 'T23:59:59')] };
    }
    const faltantes = await Faltante.findAll({
      where,
      include: [{ model: Producto, attributes: ['id', 'nombre'], required: false }],
      order: [['createdAt', 'DESC']],
    });
    res.json(faltantes);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const f = await Faltante.create({ ...req.body, usuarioId: req.user?.sub });
    res.status(201).json(f);
  } catch (err) { next(err); }
};

exports.updateEstado = async (req, res, next) => {
  try {
    const f = await Faltante.findByPk(req.params.id);
    if (!f) return res.status(404).json({ error: 'Faltante no encontrado' });
    const { estado } = req.body;
    if (!['pendiente', 'resuelto', 'descartado'].includes(estado)) {
      return res.status(400).json({ error: 'estado inválido' });
    }
    await f.update({ estado });
    res.json(f);
  } catch (err) { next(err); }
};

// RF-155: reporte agrupado para apoyar compras
exports.reporte = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.tipo)   where.tipo   = req.query.tipo;
    if (req.query.desde && req.query.hasta) {
      where.createdAt = { [Op.between]: [new Date(req.query.desde), new Date(req.query.hasta + 'T23:59:59')] };
    }

    const faltantes = await Faltante.findAll({ where, order: [['createdAt', 'DESC']] });

    // Agrupar por nombre normalizado
    const agrupado = {};
    for (const f of faltantes) {
      const key = f.nombreProducto.toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // quitar tildes para agrupar
      if (!agrupado[key]) {
        agrupado[key] = {
          nombreProducto: f.nombreProducto,
          veces:          0,
          ultimaFecha:    f.createdAt,
          estado:         f.estado,
          tipo:           f.tipo,
          cantidadTotal:  0,
        };
      }
      agrupado[key].veces++;
      agrupado[key].cantidadTotal += f.cantidad || 0;
      if (new Date(f.createdAt) > new Date(agrupado[key].ultimaFecha)) {
        agrupado[key].ultimaFecha = f.createdAt;
        agrupado[key].estado = f.estado;
      }
    }

    const resultado = Object.values(agrupado).sort((a, b) => b.veces - a.veces);
    res.json(resultado);
  } catch (err) { next(err); }
};