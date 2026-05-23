const { Producto, VentaItem } = require('../models');
const { Op } = require('sequelize');

// Genera código interno automático: CAT-XXXXX
async function generarCodigo(categoriaId) {
  const prefijos = { 1: 'ESC', 2: 'PAP', 3: 'ART', 4: 'ORG' };
  const prefijo = prefijos[categoriaId] || 'PRD';
  const count = await Producto.count();
  const num = String(count + 1).padStart(4, '0');
  return `${prefijo}-${num}`;
}

exports.list = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.search) where.nombre = { [Op.like]: `%${req.query.search}%` };
    const productos = await Producto.findAll({ where });
    res.json(productos);
  } catch (err) { next(err); }
};

exports.show = async (req, res, next) => {
  try {
    const p = await Producto.findByPk(req.params.id);
    if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(p);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { nombre, descripcion, precio, costo, categoriaId, imagen,
      badge, codigoInterno, codigoBarras, unidadVenta, stock } = req.body;

    if (!nombre || nombre.trim() === '') return res.status(400).json({ error: 'El nombre es requerido' });
    if (!precio || isNaN(parseFloat(precio))) return res.status(400).json({ error: 'El precio es requerido' });

    // Auto-generar código si no viene uno
    const codigo = codigoInterno?.trim() || await generarCodigo(categoriaId);

    const p = await Producto.create({
      nombre: nombre.trim(), descripcion: descripcion || null,
      precio: parseFloat(precio), costo: parseFloat(costo) || 0,
      categoriaId: categoriaId || null, imagen: imagen || null,
      badge: badge || null, codigoInterno: codigo,
      codigoBarras: codigoBarras || null,
      unidadVenta: unidadVenta || 'unidad',
      stock: parseFloat(stock) || 0, trackInventory: true,
    });
    res.status(201).json(p);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const p = await Producto.findByPk(req.params.id);
    if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
    const { nombre, descripcion, precio, costo, categoriaId, imagen,
      badge, codigoInterno, codigoBarras, unidadVenta, stock } = req.body;
    await p.update({
      nombre: nombre?.trim() || p.nombre,
      descripcion: descripcion ?? p.descripcion,
      precio: precio !== undefined ? parseFloat(precio) : p.precio,
      costo: costo !== undefined ? parseFloat(costo) : p.costo,
      categoriaId: categoriaId !== undefined ? (categoriaId || null) : p.categoriaId,
      imagen: imagen !== undefined ? (imagen || null) : p.imagen,
      badge: badge !== undefined ? (badge || null) : p.badge,
      codigoInterno: codigoInterno?.trim() || p.codigoInterno,
      codigoBarras: codigoBarras !== undefined ? (codigoBarras || null) : p.codigoBarras,
      unidadVenta: unidadVenta || p.unidadVenta,
      stock: stock !== undefined ? parseFloat(stock) : p.stock,
      trackInventory: true,
    });
    res.json(p);
  } catch (err) { next(err); }
};

exports.destroy = async (req, res, next) => {
  try {
    const p = await Producto.findByPk(req.params.id);
    if (!p) return res.status(404).json({ error: 'Producto no encontrado' });

    // Desasociar de VentaItems
    await VentaItem.update(
      { productoId: null },
      { where: { productoId: req.params.id } }
    );

    // Desasociar de CompraItems
    const { CompraItem } = require('../models');
    await CompraItem.update(
      { productoId: null },
      { where: { productoId: req.params.id } }
    );

    await p.destroy();
    res.status(204).send();
  } catch (err) { next(err); }
};