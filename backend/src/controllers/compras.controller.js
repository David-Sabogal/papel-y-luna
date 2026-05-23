const { Compra, CompraItem, Producto, Proveedor } = require('../models');

exports.list = async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    const where = {};
    if (req.query.proveedorId) where.proveedorId = req.query.proveedorId;
    if (req.query.desde && req.query.hasta) {
      where.createdAt = {
        [Op.between]: [
          new Date(req.query.desde),
          new Date(req.query.hasta + 'T23:59:59'),
        ],
      };
    }
    const compras = await Compra.findAll({
      where,
      include: [
        { model: Proveedor, attributes: ['id', 'nombre'] },
        { model: CompraItem, include: [{ model: Producto, attributes: ['id', 'nombre'] }] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(compras);
  } catch (err) { next(err); }
};

exports.show = async (req, res, next) => {
  try {
    const c = await Compra.findByPk(req.params.id, {
      include: [
        { model: Proveedor },
        { model: CompraItem, include: [Producto] },
      ],
    });
    if (!c) return res.status(404).json({ error: 'Compra no encontrada' });
    res.json(c);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  const t = await Compra.sequelize.transaction();
  try {
    const { proveedorId, metodoPago, items, observaciones } = req.body;

    let total = 0;
    for (const item of items) {
      total += item.costoUnitario * item.cantidad;
    }

    const compra = await Compra.create({
      proveedorId: proveedorId || null,
      metodoPago,
      total,
      observaciones: observaciones || null,
      usuarioId: req.user?.sub || null,
    }, { transaction: t });

    for (const item of items) {
      const subtotal = item.costoUnitario * item.cantidad;
      await CompraItem.create({
        compraId: compra.id,
        productoId: item.productoId || null,
        nombreProducto: item.nombreProducto || null,
        cantidad: item.cantidad,
        costoUnitario: item.costoUnitario,
        subtotal,
      }, { transaction: t });

      // Actualizar stock si el producto existe y tiene trackInventory
      if (item.productoId) {
        const producto = await Producto.findByPk(item.productoId, { transaction: t });
        if (producto && producto.trackInventory) {
          await producto.update(
            { stock: producto.stock + item.cantidad },
            { transaction: t }
          );
        }
      }
    }

    await t.commit();

    const compraCompleta = await Compra.findByPk(compra.id, {
      include: [Proveedor, { model: CompraItem, include: [Producto] }],
    });
    res.status(201).json(compraCompleta);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};