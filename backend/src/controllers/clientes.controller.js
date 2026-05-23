const { Cliente, Venta } = require('../models');

exports.list = async (req, res, next) => {
  try {
    const clientes = await Cliente.findAll({ order: [['nombre', 'ASC']] });
    res.json(clientes);
  } catch (err) { next(err); }
};

exports.show = async (req, res, next) => {
  try {
    const c = await Cliente.findByPk(req.params.id, {
      include: [{ model: Venta, attributes: ['id', 'total', 'estado', 'createdAt', 'saldoDebe'] }],
    });
    if (!c) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(c);
  } catch (err) { next(err); }
};

exports.saldo = async (req, res, next) => {
  try {
    const c = await Cliente.findByPk(req.params.id, {
      attributes: ['id', 'nombre', 'saldoDebe'],
    });
    if (!c) return res.status(404).json({ error: 'Cliente no encontrado' });
    const ventasDeuda = await Venta.findAll({
      where: { clienteId: req.params.id, estado: 'cerrada' },
      attributes: ['id', 'total', 'saldoDebe', 'metodoPago', 'createdAt'],
    });
    res.json({
      clienteId:  c.id,
      nombre:     c.nombre,
      saldoDebe:  c.saldoDebe,
      ventasPendientes: ventasDeuda.filter(v => v.saldoDebe > 0),
    });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const c = await Cliente.create(req.body);
    res.status(201).json(c);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const c = await Cliente.findByPk(req.params.id);
    if (!c) return res.status(404).json({ error: 'Cliente no encontrado' });
    await c.update(req.body);
    res.json(c);
  } catch (err) { next(err); }
};

exports.destroy = async (req, res, next) => {
  try {
    const c = await Cliente.findByPk(req.params.id);
    if (!c) return res.status(404).json({ error: 'Cliente no encontrado' });
    if (c.saldoDebe > 0) {
      return res.status(400).json({
        error: `No se puede eliminar: el cliente tiene saldo pendiente de $${c.saldoDebe.toLocaleString('es-CO')}`,
      });
    }
    await Venta.update({ clienteId: null }, { where: { clienteId: req.params.id } });
    await c.destroy();
    res.status(204).send();
  } catch (err) { next(err); }
};