const { Categoria, Producto } = require('../models');

exports.list = async (req, res, next) => {
  try {
    const categorias = await Categoria.findAll({ order: [['nombre', 'ASC']] });
    res.json(categorias);
  } catch (err) { next(err); }
};

exports.show = async (req, res, next) => {
  try {
    const c = await Categoria.findByPk(req.params.id);
    if (!c) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(c);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const c = await Categoria.create(req.body);
    res.status(201).json(c);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const c = await Categoria.findByPk(req.params.id);
    if (!c) return res.status(404).json({ error: 'Categoría no encontrada' });
    await c.update(req.body);
    res.json(c);
  } catch (err) { next(err); }
};

exports.destroy = async (req, res, next) => {
  try {
    const c = await Categoria.findByPk(req.params.id);
    if (!c) return res.status(404).json({ error: 'Categoría no encontrada' });

    // Desasignar la categoría de todos los productos que la tienen
    await Producto.update(
      { categoriaId: null },
      { where: { categoriaId: req.params.id } }
    );

    await c.destroy();
    res.status(204).send();
  } catch (err) { next(err); }
};