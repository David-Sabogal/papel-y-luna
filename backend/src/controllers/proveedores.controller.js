const { Proveedor, Compra, CompraItem } = require('../models');

exports.list = async (req, res, next) => {
  try {
    const proveedores = await Proveedor.findAll({ order: [['nombre', 'ASC']] });
    res.json(proveedores);
  } catch (err) { next(err); }
};

exports.show = async (req, res, next) => {
  try {
    const p = await Proveedor.findByPk(req.params.id, {
      include: [{ model: Compra, attributes: ['id', 'total', 'metodoPago', 'createdAt'] }],
    });
    if (!p) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(p);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const p = await Proveedor.create(req.body);
    res.status(201).json(p);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const p = await Proveedor.findByPk(req.params.id);
    if (!p) return res.status(404).json({ error: 'Proveedor no encontrado' });
    await p.update(req.body);
    res.json(p);
  } catch (err) { next(err); }
};

exports.destroy = async (req, res, next) => {
  try {
    const p = await Proveedor.findByPk(req.params.id);
    if (!p) return res.status(404).json({ error: 'Proveedor no encontrado' });

    // Desasociar compras del proveedor (no se borran, quedan sin proveedor)
    await Compra.update(
      { proveedorId: null },
      { where: { proveedorId: req.params.id } }
    );

    await p.destroy();
    res.status(204).send();
  } catch (err) { next(err); }
};