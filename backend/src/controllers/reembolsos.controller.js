'use strict';
const { Reembolso, ReembolsoItem, VentaItem, Venta, Producto, Cliente } = require('../models');

exports.create = async (req, res, next) => {
  const t = await Reembolso.sequelize.transaction();
  try {
    const ventaId = parseInt(req.params.ventaId);
    const { tipo, items, observaciones, fuente } = req.body;

    const venta = await Venta.findByPk(ventaId, {
      include: [{ model: VentaItem, as: 'items' }],
      transaction: t,
    });

    if (!venta) { await t.rollback(); return res.status(404).json({ error: 'Venta no encontrada' }); }
    if (venta.estado === 'anulada') { await t.rollback(); return res.status(400).json({ error: 'No se puede reembolsar una venta anulada' }); }

    // Cuánto ya fue reembolsado por producto
    const reembolsosPrevios = await Reembolso.findAll({
      where: { ventaId },
      include: [{ model: ReembolsoItem }],
    });

    const yaReembolsadoPorProducto = {};
    for (const r of reembolsosPrevios) {
      for (const ri of r.ReembolsoItems) {
        yaReembolsadoPorProducto[ri.productoId] = (yaReembolsadoPorProducto[ri.productoId] || 0) + ri.cantidad;
      }
    }

    // Validar cantidades
    for (const item of items) {
      const ventaItem = venta.items.find(vi => vi.productoId === item.productoId);
      if (!ventaItem) { await t.rollback(); return res.status(404).json({ error: `Producto no encontrado en la venta` }); }
      const disponible = ventaItem.quantity - (yaReembolsadoPorProducto[item.productoId] || 0);
      if (item.cantidad > disponible) {
        await t.rollback();
        return res.status(400).json({ error: `Solo puedes reembolsar ${disponible} unidad(es)` });
      }
    }

    // ── Factor de descuento aplicado a la venta ───────────────────
    // Si el total es menor al subtotal, hay descuento proporcional
    const factorDescuento = venta.subtotal > 0 ? venta.total / venta.subtotal : 1;

    const esDebe      = venta.metodoPago === 'Debe';
    const totalPagado = venta.valorRecibido || 0;

    let montoTotal = 0;
    const itemsProcesados = [];

    for (const item of items) {
      const ventaItem = venta.items.find(vi => vi.productoId === item.productoId);
      let montoReembolso = 0;

      // Precio real pagado por unidad = precio * factorDescuento
      const precioConDescuento = ventaItem.price * factorDescuento;

      if (esDebe) {
        if (totalPagado > 0 && venta.total > 0) {
          const proporcion = (precioConDescuento * item.cantidad) / venta.total;
          montoReembolso = parseFloat((proporcion * totalPagado).toFixed(2));
        } else {
          montoReembolso = 0;
        }
      } else {
        // Pago normal: devolver precio con descuento aplicado
        montoReembolso = parseFloat((precioConDescuento * item.cantidad).toFixed(2));
      }

      montoTotal += montoReembolso;
      itemsProcesados.push({ ...item, montoReembolso, productoId: ventaItem.productoId, cantidadVendida: ventaItem.quantity });
    }

    const reembolso = await Reembolso.create({
      ventaId, tipo, montoTotal,
      fuente: fuente || 'Caja',
      observaciones: observaciones || null,
      usuarioId: req.user?.sub || null,
    }, { transaction: t });

    for (const item of itemsProcesados) {
      await ReembolsoItem.create({
        reembolsoId: reembolso.id,
        ventaItemId: item.productoId,
        productoId:  item.productoId,
        cantidad:    item.cantidad,
        montoReembolso: item.montoReembolso,
        retornaInventario: item.retornaInventario !== false,
      }, { transaction: t });

      if (item.retornaInventario !== false && item.productoId) {
        const prod = await Producto.findByPk(item.productoId, { transaction: t });
        if (prod && prod.trackInventory) {
          await prod.update({ stock: prod.stock + item.cantidad }, { transaction: t });
        }
      }
    }

    // Verificar si se reembolsó todo
    const totalItemsVendidos     = venta.items.reduce((s, i) => s + i.quantity, 0);
    const totalItemsReembolsados = Object.values({
      ...yaReembolsadoPorProducto,
      ...Object.fromEntries(itemsProcesados.map(i => [
        i.productoId,
        (yaReembolsadoPorProducto[i.productoId] || 0) + i.cantidad,
      ])),
    }).reduce((s, v) => s + v, 0);

    const reembolsoCompleto = totalItemsReembolsados >= totalItemsVendidos;

    if (tipo === 'total' || reembolsoCompleto) {
      await venta.update({ estado: 'anulada' }, { transaction: t });
      if (venta.saldoDebe > 0 && venta.clienteId) {
        const cliente = await Cliente.findByPk(venta.clienteId, { transaction: t });
        if (cliente) {
          await cliente.update({ saldoDebe: Math.max((cliente.saldoDebe || 0) - venta.saldoDebe, 0) }, { transaction: t });
        }
      }
    } else if (tipo === 'parcial' && esDebe && venta.clienteId) {
      const proporcionDevuelta = itemsProcesados.reduce((s, i) => s + i.cantidad / i.cantidadVendida, 0) / venta.items.length;
      const reduccionSaldo = parseFloat((venta.saldoDebe * proporcionDevuelta).toFixed(2));
      if (reduccionSaldo > 0) {
        await venta.update({ saldoDebe: Math.max(venta.saldoDebe - reduccionSaldo, 0) }, { transaction: t });
        const cliente = await Cliente.findByPk(venta.clienteId, { transaction: t });
        if (cliente) await cliente.update({ saldoDebe: Math.max((cliente.saldoDebe || 0) - reduccionSaldo, 0) }, { transaction: t });
      }
    }

    await t.commit();
    const result = await Reembolso.findByPk(reembolso.id, { include: [ReembolsoItem] });
    res.status(201).json(result);
  } catch (err) { await t.rollback(); next(err); }
};

exports.listByVenta = async (req, res, next) => {
  try {
    const reembolsos = await Reembolso.findAll({
      where: { ventaId: req.params.ventaId },
      include: [ReembolsoItem],
      order: [['createdAt', 'DESC']],
    });
    res.json(reembolsos);
  } catch (err) { next(err); }
};