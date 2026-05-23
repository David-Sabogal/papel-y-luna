const { Descuento } = require('../models');

exports.list = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.activo !== undefined) where.activo = req.query.activo === 'true';
    const descuentos = await Descuento.findAll({ where, order: [['nombre', 'ASC']] });
    res.json(descuentos);
  } catch (err) { next(err); }
};

exports.show = async (req, res, next) => {
  try {
    const d = await Descuento.findByPk(req.params.id);
    if (!d) return res.status(404).json({ error: 'Descuento no encontrado' });
    res.json(d);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const d = await Descuento.create(req.body);
    res.status(201).json(d);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const d = await Descuento.findByPk(req.params.id);
    if (!d) return res.status(404).json({ error: 'Descuento no encontrado' });
    await d.update(req.body);
    res.json(d);
  } catch (err) { next(err); }
};

exports.destroy = async (req, res, next) => {
  try {
    const d = await Descuento.findByPk(req.params.id);
    if (!d) return res.status(404).json({ error: 'Descuento no encontrado' });
    await d.destroy();
    res.status(204).send();
  } catch (err) { next(err); }
};