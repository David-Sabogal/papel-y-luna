'use strict';
const { Venta, VentaItem, Producto, Cliente, Descuento, Usuario } = require('../models');
const { Op } = require('sequelize');

const includeCompleto = [
  { model: VentaItem, as: 'items', include: [{ model: Producto, attributes: ['id', 'nombre', 'precio', 'imagen'], required: false }] },
  { model: Cliente,   attributes: ['id', 'nombre', 'telefono'], required: false },
  { model: Descuento, attributes: ['id', 'nombre', 'tipo', 'valor'], required: false },
  { model: Usuario,   attributes: ['id', 'username'], required: false },
];

// ── Listar ventas ─────────────────────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.estado)     where.estado = req.query.estado;
    if (req.query.metodoPago) where.metodoPago = req.query.metodoPago;
    if (req.query.clienteId)  where.clienteId = req.query.clienteId;
    if (req.query.desde && req.query.hasta) {
      where.createdAt = {
        [Op.between]: [
          new Date(req.query.desde),
          new Date(req.query.hasta + 'T23:59:59'),
        ],
      };
    }
    const ventas = await Venta.findAll({
      where,
      include: includeCompleto,
      order: [['createdAt', 'DESC']],
    });
    res.json(ventas);
  } catch (err) { next(err); }
};

// ── Ver una venta ─────────────────────────────────────────────────
exports.show = async (req, res, next) => {
  try {
    const v = await Venta.findByPk(req.params.id, { include: includeCompleto });
    if (!v) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json(v);
  } catch (err) { next(err); }
};

// ── Crear venta ───────────────────────────────────────────────────
exports.create = async (req, res, next) => {
  const t = await Venta.sequelize.transaction();
  try {
    const {
      items = [],
      clienteId,
      descuentoId,
      metodoPago,
      valorRecibido,
      abonoInicial,
      estado = 'abierta',
    } = req.body;

    if (estado === 'cerrada' && items.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'No se puede cerrar una venta sin productos' });
    }

    if (metodoPago === 'Debe' && !clienteId && estado === 'cerrada') {
      await t.rollback();
      return res.status(400).json({ error: 'El método Debe requiere seleccionar un cliente' });
    }

    let subtotal = 0;
    const itemsConPrecio = [];

    for (const item of items) {
      const producto = await Producto.findByPk(item.productoId, { transaction: t });
      if (!producto) {
        await t.rollback();
        return res.status(404).json({ error: `Producto ${item.productoId} no encontrado` });
      }
      if (producto.trackInventory && estado === 'cerrada' && producto.stock < item.quantity) {
        await t.rollback();
        return res.status(400).json({
          error: `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}`,
        });
      }
      const precioUnitario = item.precioUnitario !== undefined ? item.precioUnitario : producto.precio;
      const itemSubtotal = precioUnitario * item.quantity;
      subtotal += itemSubtotal;
      itemsConPrecio.push({ ...item, precioUnitario, itemSubtotal, producto });
    }

    let descuentoValor = 0;
    if (descuentoId) {
      const desc = await Descuento.findByPk(descuentoId, { transaction: t });
      if (desc && desc.activo) {
        descuentoValor = desc.tipo === 'porcentaje' ? subtotal * (desc.valor / 100) : desc.valor;
        descuentoValor = Math.min(descuentoValor, subtotal);
      }
    }

    const total = Math.max(subtotal - descuentoValor, 0);
    const cambio = metodoPago === 'Efectivo' ? Math.max((valorRecibido || 0) - total, 0) : 0;
    const abono = metodoPago === 'Debe' ? Math.min(parseFloat(abonoInicial) || 0, total) : 0;
    const saldoDebe = metodoPago === 'Debe' ? total - abono : 0;

    const venta = await Venta.create({
      estado,
      clienteId:      clienteId || null,
      descuentoId:    descuentoId || null,
      descuentoValor,
      subtotal,
      iva: 0,
      total,
      metodoPago:     metodoPago || null,
      valorRecibido:  metodoPago === 'Debe' ? abono : (valorRecibido || 0),
      cambio,
      saldoDebe,
      usuarioId: req.user?.sub || null,
    }, { transaction: t });

    for (const item of itemsConPrecio) {
  await VentaItem.create({
    ventaId:        venta.id,
    productoId:     item.productoId,
    nombreProducto: item.producto?.nombre || item.nombre || item.nombreProducto || null,
    quantity:       item.quantity,
    price:          item.precioUnitario,
    subtotal:       item.itemSubtotal,
    selectedColor:  item.selectedColor || null,
  }, { transaction: t });

  if (estado === 'cerrada' && item.producto.trackInventory) {
    await item.producto.update(
      { stock: item.producto.stock - item.quantity },
      { transaction: t }
    );
  }
}

    if (saldoDebe > 0 && clienteId) {
      const cliente = await Cliente.findByPk(clienteId, { transaction: t });
      if (cliente) {
        await cliente.update(
          { saldoDebe: (cliente.saldoDebe || 0) + saldoDebe },
          { transaction: t }
        );
      }
    }

    await t.commit();
    const ventaCompleta = await Venta.findByPk(venta.id, { include: includeCompleto });
    res.status(201).json(ventaCompleta);
  } catch (err) { await t.rollback(); next(err); }
};

// ── Registrar abono ───────────────────────────────────────────────
exports.registrarAbono = async (req, res, next) => {
  const t = await Venta.sequelize.transaction();
  try {
    const venta = await Venta.findByPk(req.params.id, { transaction: t });
    if (!venta) { await t.rollback(); return res.status(404).json({ error: 'Venta no encontrada' }); }
    if (venta.saldoDebe <= 0) { await t.rollback(); return res.status(400).json({ error: 'Esta venta no tiene saldo pendiente' }); }

    const { abono } = req.body;
    const abonoVal = Math.min(parseFloat(abono) || 0, venta.saldoDebe);
    if (abonoVal <= 0) { await t.rollback(); return res.status(400).json({ error: 'El abono debe ser mayor a 0' }); }

    const nuevoSaldo = parseFloat((venta.saldoDebe - abonoVal).toFixed(2));

    await venta.update({
      saldoDebe:     nuevoSaldo,
      valorRecibido: (venta.valorRecibido || 0) + abonoVal,
      fueCOrregida:  true,
      corregidaPor:  req.user?.sub,
      corregidaEn:   new Date(),
      snapshotAnterior: JSON.stringify({
        accion:        'abono',
        abono:         abonoVal,
        saldoAnterior: venta.saldoDebe,
        saldoNuevo:    nuevoSaldo,
        fecha:         new Date(),
        usuario:       req.user?.username,
      }),
    }, { transaction: t });

    if (venta.clienteId) {
      const cliente = await Cliente.findByPk(venta.clienteId, { transaction: t });
      if (cliente) {
        await cliente.update(
          { saldoDebe: Math.max((cliente.saldoDebe || 0) - abonoVal, 0) },
          { transaction: t }
        );
      }
    }

    await t.commit();
    const ventaActualizada = await Venta.findByPk(venta.id, { include: includeCompleto });
    res.json(ventaActualizada);
  } catch (err) { await t.rollback(); next(err); }
};

// ── Corregir / cerrar venta ───────────────────────────────────────
exports.corregir = async (req, res, next) => {
  const t = await Venta.sequelize.transaction();
  try {
    const venta = await Venta.findByPk(req.params.id, {
      include: [{ model: VentaItem, as: 'items' }],
      transaction: t,
    });
    if (!venta) { await t.rollback(); return res.status(404).json({ error: 'Venta no encontrada' }); }
    if (venta.estado === 'anulada') { await t.rollback(); return res.status(400).json({ error: 'No se puede corregir una venta anulada' }); }

    const {
      items,
      clienteId,
      descuentoId,
      metodoPago,
      valorRecibido,
      abonoInicial,
      estado,
    } = req.body;

    // Estado destino: si viene 'cerrada' en el body, cerrar; si no, mantener o guardar
    const estadoDestino = estado || venta.estado;

    // Snapshot del estado anterior
    const snapshotAnterior = JSON.stringify({
      accion:        venta.estado === 'cerrada' ? 'correccion' : 'cierre',
      fecha:         new Date(),
      usuario:       req.user?.username,
      estadoAnterior: {
        estado:     venta.estado,
        items:      venta.items,
        subtotal:   venta.subtotal,
        total:      venta.total,
        metodoPago: venta.metodoPago,
        clienteId:  venta.clienteId,
        descuentoId: venta.descuentoId,
      },
    });

    // Restaurar stock si la venta estaba cerrada
    if (venta.estado === 'cerrada') {
      for (const oldItem of venta.items) {
        if (oldItem.productoId) {
          const prod = await Producto.findByPk(oldItem.productoId, { transaction: t });
          if (prod && prod.trackInventory) {
            await prod.update({ stock: prod.stock + oldItem.quantity }, { transaction: t });
          }
        }
      }
    }

    // Restaurar saldo del cliente si era Debe
    if (venta.metodoPago === 'Debe' && venta.saldoDebe > 0 && venta.clienteId) {
      const clienteAnterior = await Cliente.findByPk(venta.clienteId, { transaction: t });
      if (clienteAnterior) {
        await clienteAnterior.update(
          { saldoDebe: Math.max((clienteAnterior.saldoDebe || 0) - venta.saldoDebe, 0) },
          { transaction: t }
        );
      }
    }

    // Borrar items anteriores
    await VentaItem.destroy({ where: { ventaId: venta.id }, transaction: t });

    // Calcular nuevos totales
    let subtotal = 0;
    const itemsConPrecio = [];

    for (const item of (items || [])) {
      const producto = await Producto.findByPk(item.productoId, { transaction: t });
      if (!producto) { await t.rollback(); return res.status(404).json({ error: `Producto ${item.productoId} no encontrado` }); }

      const precioUnitario = item.precioUnitario !== undefined ? item.precioUnitario : producto.precio;
      const itemSubtotal = precioUnitario * item.quantity;
      subtotal += itemSubtotal;
      itemsConPrecio.push({ ...item, precioUnitario, itemSubtotal, producto });

      await VentaItem.create({
        ventaId:       venta.id,
        productoId:    item.productoId,
        nombreProducto: producto?.nombre || null,
        quantity:      item.quantity,
        price:         precioUnitario,
        subtotal:      itemSubtotal,
        selectedColor: item.selectedColor || null,
      }, { transaction: t });

      // Solo descontar stock si se está cerrando
      if (estadoDestino === 'cerrada' && producto.trackInventory) {
        await producto.update({ stock: producto.stock - item.quantity }, { transaction: t });
      }
    }

    // Descuento
    let descuentoValor = 0;
    const descId = descuentoId !== undefined ? descuentoId : venta.descuentoId;
    if (descId) {
      const desc = await Descuento.findByPk(descId, { transaction: t });
      if (desc && desc.activo) {
        descuentoValor = desc.tipo === 'porcentaje' ? subtotal * (desc.valor / 100) : desc.valor;
        descuentoValor = Math.min(descuentoValor, subtotal);
      }
    }

    const total = Math.max(subtotal - descuentoValor, 0);
    const metodo = metodoPago !== undefined ? metodoPago : venta.metodoPago;
    const abono  = metodo === 'Debe' ? Math.min(parseFloat(abonoInicial) || 0, total) : 0;
    const saldoDebe = metodo === 'Debe' ? total - abono : 0;
    const cambio = metodo === 'Efectivo' ? Math.max((parseFloat(valorRecibido) || 0) - total, 0) : 0;

    await venta.update({
      estado:        estadoDestino,
      subtotal,
      total,
      descuentoValor,
      clienteId:     clienteId !== undefined ? clienteId : venta.clienteId,
      descuentoId:   descId,
      metodoPago:    metodo,
      valorRecibido: metodo === 'Debe' ? abono : (valorRecibido !== undefined ? parseFloat(valorRecibido) || 0 : venta.valorRecibido),
      cambio,
      saldoDebe,
      fueCOrregida:  true,
      corregidaPor:  req.user?.sub,
      corregidaEn:   new Date(),
      snapshotAnterior,
    }, { transaction: t });

    // Actualizar saldo del cliente si la venta se cierra con Debe
    if (estadoDestino === 'cerrada' && saldoDebe > 0) {
      const cId = clienteId !== undefined ? clienteId : venta.clienteId;
      if (cId) {
        const cliente = await Cliente.findByPk(cId, { transaction: t });
        if (cliente) {
          await cliente.update(
            { saldoDebe: (cliente.saldoDebe || 0) + saldoDebe },
            { transaction: t }
          );
        }
      }
    }

    await t.commit();
    const ventaActualizada = await Venta.findByPk(venta.id, { include: includeCompleto });
    res.json(ventaActualizada);
  } catch (err) { await t.rollback(); next(err); }
};

exports.anular = async (req, res, next) => {
  const t = await Venta.sequelize.transaction();
  try {
    const venta = await Venta.findByPk(req.params.id, {
      include: [{ model: VentaItem, as: 'items' }],
      transaction: t,
    });
    if (!venta) { await t.rollback(); return res.status(404).json({ error: 'Venta no encontrada' }); }
    if (venta.estado === 'anulada') { await t.rollback(); return res.status(400).json({ error: 'Ya está anulada' }); }

    // Verificar cuánto stock ya fue revertido por reembolsos parciales
    const { Reembolso, ReembolsoItem } = require('../models');
    const reembolsosPrevios = await Reembolso.findAll({
      where: { ventaId: venta.id },
      include: [{ model: ReembolsoItem }],
      transaction: t,
    });

    const yaRevertidoPorProducto = {};
    for (const r of reembolsosPrevios) {
      for (const ri of r.ReembolsoItems) {
        if (ri.retornaInventario) {
          yaRevertidoPorProducto[ri.productoId] = (yaRevertidoPorProducto[ri.productoId] || 0) + ri.cantidad;
        }
      }
    }

    // Restaurar stock SOLO de lo que NO fue revertido ya
    if (venta.estado === 'cerrada') {
      for (const item of venta.items) {
        if (item.productoId) {
          const yaRevertido = yaRevertidoPorProducto[item.productoId] || 0;
          const pendienteRevertir = item.quantity - yaRevertido;
          if (pendienteRevertir > 0) {
            const prod = await Producto.findByPk(item.productoId, { transaction: t });
            if (prod && prod.trackInventory) {
              await prod.update({ stock: prod.stock + pendienteRevertir }, { transaction: t });
            }
          }
        }
      }
    }

    // Restaurar saldo del cliente considerando reembolsos ya hechos
    if (venta.saldoDebe > 0 && venta.clienteId) {
      const cliente = await Cliente.findByPk(venta.clienteId, { transaction: t });
      if (cliente) {
        await cliente.update(
          { saldoDebe: Math.max((cliente.saldoDebe || 0) - venta.saldoDebe, 0) },
          { transaction: t }
        );
      }
    }

    await venta.update({
      estado:       'anulada',
      fueCOrregida: true,
      corregidaPor: req.user?.sub,
      corregidaEn:  new Date(),
      snapshotAnterior: JSON.stringify({
        accion:  'anulacion',
        motivo:  req.body.motivo || '',
        fecha:   new Date(),
        usuario: req.user?.username,
      }),
    }, { transaction: t });

    await t.commit();
    res.json({ mensaje: 'Venta anulada correctamente', id: venta.id });
  } catch (err) { await t.rollback(); next(err); }
};

// ── Reporte ───────────────────────────────────────────────────────
exports.reporteVentas = async (req, res, next) => {
  try {
    const { desde, hasta } = req.query;
    const where = { estado: 'cerrada' };
    if (desde && hasta) {
      where.createdAt = {
        [Op.between]: [new Date(desde), new Date(hasta + 'T23:59:59')],
      };
    }
    const ventas = await Venta.findAll({
      where,
      include: [{ model: VentaItem, as: 'items', include: [Producto] }],
      order: [['createdAt', 'DESC']],
    });

    const conteo = {};
    for (const v of ventas) {
      for (const item of v.items) {
       const key = item.productoId || `del-${item.nombreProducto}`;
if (!conteo[key]) {
  conteo[key] = { productoId: item.productoId, nombre: item.Producto?.nombre || item.nombreProducto || 'Producto Eliminado', cantidad: 0, total: 0 };
}
        conteo[key].cantidad += item.quantity;
        conteo[key].total    += item.subtotal;
      }
    }

    res.json({
      totalVentas:  ventas.length,
      totalGeneral: ventas.reduce((s, v) => s + v.total, 0),
      productosMasVendidos: Object.values(conteo).sort((a, b) => b.cantidad - a.cantidad).slice(0, 10),
      ventas,
    });
  } catch (err) { next(err); }
};