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

    // Calcular cuánto ya fue reembolsado por producto
    const reembolsosPrevios = await Reembolso.findAll({
      where: { ventaId },
      include: [{ model: ReembolsoItem }],
    });

    const yaReembolsadoPorProducto = {};
    let totalYaReembolsado = 0;
    for (const r of reembolsosPrevios) {
      totalYaReembolsado += r.montoTotal || 0;
      for (const ri of r.ReembolsoItems) {
        yaReembolsadoPorProducto[ri.productoId] = (yaReembolsadoPorProducto[ri.productoId] || 0) + ri.cantidad;
      }
    }

    // Validar cantidades disponibles
    for (const item of items) {
      const ventaItem = venta.items.find(vi => vi.productoId === item.productoId);
      if (!ventaItem) {
        await t.rollback();
        return res.status(404).json({ error: `Producto ${item.productoId} no encontrado en la venta` });
      }
      const yaReembolsado = yaReembolsadoPorProducto[item.productoId] || 0;
      const disponible = ventaItem.quantity - yaReembolsado;
      if (item.cantidad > disponible) {
        await t.rollback();
        return res.status(400).json({
          error: `Solo puedes reembolsar ${disponible} unidad(es) de este producto`,
        });
      }
    }

    // Calcular monto del reembolso
    // Para ventas Debe: si abono = 0, no hay nada monetario que reembolsar
    // pero sí se puede revertir el saldo de deuda y el inventario
    const esDebe = venta.metodoPago === 'Debe';
    const totalPagado = venta.valorRecibido || 0; // lo que realmente pagó el cliente

    let montoTotal = 0;
    const itemsProcesados = [];

    for (const item of items) {
      const ventaItem = venta.items.find(vi => vi.productoId === item.productoId);
      let montoReembolso = 0;

      if (esDebe) {
        if (totalPagado > 0 && venta.total > 0) {
          // Proporcional a lo pagado
          const proporcionItem = (ventaItem.price * item.cantidad) / venta.total;
          const montoMaxItem = proporcionItem * totalPagado;
          // Descontar lo ya reembolsado de este ítem
          const yaReembolsadoItem = (yaReembolsadoPorProducto[item.productoId] || 0) > 0
            ? (ventaItem.price * (yaReembolsadoPorProducto[item.productoId] || 0) / venta.total) * totalPagado
            : 0;
          montoReembolso = Math.max(montoMaxItem - yaReembolsadoItem, 0);
          montoReembolso = parseFloat(montoReembolso.toFixed(2));
        } else {
          // Abono = 0: el reembolso monetario es 0, pero se procesa para revertir inventario y deuda
          montoReembolso = 0;
        }
      } else {
        montoReembolso = ventaItem.price * item.cantidad;
      }

      montoTotal += montoReembolso;
      itemsProcesados.push({
        ...item,
        montoReembolso,
        productoId: ventaItem.productoId,
        cantidadVendida: ventaItem.quantity,
      });
    }

    const reembolso = await Reembolso.create({
      ventaId,
      tipo,
      montoTotal,
      fuente:        fuente || 'Caja',
      observaciones: observaciones || null,
      usuarioId:     req.user?.sub || null,
    }, { transaction: t });

    for (const item of itemsProcesados) {
      await ReembolsoItem.create({
        reembolsoId:       reembolso.id,
        ventaItemId:       item.productoId,
        productoId:        item.productoId,
        cantidad:          item.cantidad,
        montoReembolso:    item.montoReembolso,
        retornaInventario: item.retornaInventario !== false,
      }, { transaction: t });

      if (item.retornaInventario !== false && item.productoId) {
        const prod = await Producto.findByPk(item.productoId, { transaction: t });
        if (prod && prod.trackInventory) {
          await prod.update({ stock: prod.stock + item.cantidad }, { transaction: t });
        }
      }
    }

    // Verificar si con este reembolso ya se devolvió TODO
    const totalItemsVendidos = venta.items.reduce((s, i) => s + i.quantity, 0);
    const totalItemsReembolsados = Object.values({
      ...yaReembolsadoPorProducto,
      ...Object.fromEntries(
        itemsProcesados.map(i => [
          i.productoId,
          (yaReembolsadoPorProducto[i.productoId] || 0) + i.cantidad,
        ])
      ),
    }).reduce((s, v) => s + v, 0);

    const reembolsoCompleto = totalItemsReembolsados >= totalItemsVendidos;

    if (tipo === 'total' || reembolsoCompleto) {
      // Marcar venta como anulada
      await venta.update({ estado: 'anulada' }, { transaction: t });

      // Limpiar saldo completo del cliente
      if (venta.saldoDebe > 0 && venta.clienteId) {
        const cliente = await Cliente.findByPk(venta.clienteId, { transaction: t });
        if (cliente) {
          await cliente.update(
            { saldoDebe: Math.max((cliente.saldoDebe || 0) - venta.saldoDebe, 0) },
            { transaction: t }
          );
        }
      }
    } else if (tipo === 'parcial' && esDebe && venta.clienteId) {
      // Reembolso parcial en venta Debe:
      // Calcular qué porción del saldo pendiente corresponde a los ítems devueltos
      const proporcionDevuelta = itemsProcesados.reduce((s, i) => {
        return s + (i.cantidadVendida > 0 ? i.cantidad / i.cantidadVendida : 0);
      }, 0) / venta.items.length;

      const reduccionSaldo = parseFloat((venta.saldoDebe * proporcionDevuelta).toFixed(2));
      const nuevoSaldo = Math.max(venta.saldoDebe - reduccionSaldo, 0);

      if (reduccionSaldo > 0) {
        await venta.update({ saldoDebe: nuevoSaldo }, { transaction: t });
        const cliente = await Cliente.findByPk(venta.clienteId, { transaction: t });
        if (cliente) {
          await cliente.update(
            { saldoDebe: Math.max((cliente.saldoDebe || 0) - reduccionSaldo, 0) },
            { transaction: t }
          );
        }
      }
    }

    await t.commit();
    const reembolsoResult = await Reembolso.findByPk(reembolso.id, { include: [ReembolsoItem] });
    res.status(201).json(reembolsoResult);
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