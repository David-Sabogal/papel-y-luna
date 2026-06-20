import { useState } from 'react';
import client from '../api/client';

const formatCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

export default function ReembolsoVenta({ venta, onClose }) {
  const [tipo, setTipo]     = useState('parcial');
  const [fuente, setFuente] = useState('Cash'); // Ajustado a tus nuevas fuentes
  const [observaciones, setObservations] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState('');

  const esDebe       = venta.metodoPago === 'Debe';
  const totalPagado  = venta.valorRecibido || 0;

  // Lógica de descuento proporcional integrada
  const factorDescuento = venta.subtotal > 0 ? venta.total / venta.subtotal : 1;

  const [seleccion, setSeleccion] = useState(
    venta.items.map(i => ({
      productoId:        i.productoId,
      nombre:            i.Producto?.nombre || '?',
      cantidad:          0,
      maxCantidad:       i.quantity,
      precioOriginal:    i.price,                      // Precio de lista original
      precioConDesc:     i.price * factorDescuento,    // Precio real que pagó el cliente
      retornaInventario: true,
      incluir:           false,
    }))
  );

  const toggleItem    = (id) => setSeleccion(prev => prev.map(i =>
    i.productoId === id ? { ...i, incluir: !i.incluir, cantidad: !i.incluir ? i.maxCantidad : 0 } : i));
  const cambiarCantidad = (id, val) => setSeleccion(prev => prev.map(i =>
    i.productoId === id ? { ...i, cantidad: Math.min(Math.max(parseInt(val)||0,0), i.maxCantidad) } : i));
  const toggleRetorna = (id) => setSeleccion(prev => prev.map(i =>
    i.productoId === id ? { ...i, retornaInventario: !i.retornaInventario } : i));

  const itemsSeleccionados = tipo === 'total'
    ? seleccion.map(i => ({ ...i, incluir: true, cantidad: i.maxCantidad }))
    : seleccion.filter(i => i.incluir && i.cantidad > 0);

  // Calcular monto aplicando el descuento proporcional
  const calcularMontoItem = (item) => {
    const montoBase = item.precioConDesc * item.cantidad;
    if (!esDebe) return montoBase;
    
    if (totalPagado <= 0 || venta.total <= 0) return 0;
    const proporcion = montoBase / venta.total;
    return parseFloat((proporcion * totalPagado).toFixed(2));
  };

  const montoTotal = itemsSeleccionados.reduce((s, i) => s + calcularMontoItem(i), 0);
  const puedeConfirmar = itemsSeleccionados.length > 0;

  const guardar = async () => {
    if (!puedeConfirmar) return setMsg('Selecciona al menos un producto');
    setLoading(true);
    try {
      await client.post(`/api/ventas/${venta.id}/reembolsos`, {
        tipo, fuente, observaciones,
        items: itemsSeleccionados.map(i => ({
          productoId:        i.productoId,
          cantidad:          i.cantidad,
          retornaInventario: i.retornaInventario,
        })),
      });
      onClose();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al reembolsar');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3>↩️ Reembolso — Venta #{venta.id}</h3>

        {/* Alerta visual en español si la venta tuvo descuento general */}
        {venta.descuentoValor > 0 && (
          <div style={{ background: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: 10,
            padding: '10px 14px', margin: '10px 0', fontSize: '.86rem', color: '#2e7d32' }}>
            <strong>✅ Descuento aplicado en la venta</strong>
            <p style={{ margin: '4px 0 0' }}>
              Subtotal: <strong>{formatCOP(venta.subtotal)}</strong> → 
              Total Pagado: <strong>{formatCOP(venta.total)}</strong> (Ahorro: {formatCOP(venta.descuentoValor)})
              <br />El reembolso se calcula basado en el valor real pagado por cada ítem.
            </p>
          </div>
        )}

        {esDebe && (
          <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10,
            padding: '10px 14px', margin: '10px 0', fontSize: '.86rem', color: '#f57f17' }}>
            <strong>⚠️ Venta a crédito (Debe)</strong>
            <p style={{ marginTop: 4, marginBottom: 0 }}>
              Total venta: <strong>{formatCOP(venta.total)}</strong> —
              Cliente pagó: <strong>{formatCOP(totalPagado)}</strong> —
              Saldo pendiente: <strong style={{ color: '#e03a3a' }}>{formatCOP(venta.saldoDebe)}</strong>
            </p>
            {totalPagado === 0 && (
              <p style={{ marginTop: 6, marginBottom: 0, color: '#e03a3a', fontSize: '.82rem' }}>
                El cliente no abonó dinero. El reembolso revertirá el inventario y cancelará la deuda.
              </p>
            )}
          </div>
        )}

        {msg && <p style={{ color: '#e03a3a', fontSize: '.86rem', margin: '8px 0' }}>{msg}</p>}

        <div style={{ display: 'flex', gap: 8, margin: '12px 0 10px' }}>
          {['parcial', 'total'].map(t => (
            <button key={t} onClick={() => setTipo(t)}
              className={`btn ${tipo === t ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}>
              {t === 'parcial' ? 'Parcial' : 'Total'}
            </button>
          ))}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              {tipo === 'parcial' && <th style={{ padding: '8px', fontSize: '.76rem' }}>✓</th>}
              <th style={{ padding: '8px', textAlign: 'left', fontSize: '.76rem' }}>Producto</th>
              <th style={{ padding: '8px', fontSize: '.76rem' }}>Cant.</th>
              {tipo === 'parcial' && <th style={{ padding: '8px', fontSize: '.76rem' }}>Devolver</th>}
              <th style={{ padding: '8px', fontSize: '.76rem' }}>Retorna inv.</th>
              <th style={{ padding: '8px', textAlign: 'right', fontSize: '.76rem' }}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {seleccion.map(item => {
              const activo = tipo === 'total' || item.incluir;
              const cant   = tipo === 'total' ? item.maxCantidad : item.cantidad;
              const monto  = calcularMontoItem({ ...item, cantidad: cant });
              return (
                <tr key={item.productoId}
                  style={{ borderBottom: '1px solid #f0f0f0',
                    opacity: tipo === 'parcial' && !item.incluir ? .45 : 1 }}>
                  {tipo === 'parcial' && (
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <input type="checkbox" checked={item.incluir}
                        onChange={() => toggleItem(item.productoId)} />
                    </td>
                  )}
                  <td style={{ padding: '8px', fontSize: '.86rem' }}>
                    <div>{item.nombre}</div>
                    {venta.descuentoValor > 0 && (
                      <div style={{ fontSize: '.72rem', color: '#888' }}>
                        Lista: {formatCOP(item.precioOriginal)} → Pagó: {formatCOP(item.precioConDesc)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#888' }}>/{item.maxCantidad}</td>
                  {tipo === 'parcial' && (
                    <td style={{ padding: '8px' }}>
                      <input type="number" min="0" max={item.maxCantidad} value={item.cantidad}
                        disabled={!item.incluir}
                        onChange={e => cambiarCantidad(item.productoId, e.target.value)}
                        style={{ width: 60, padding: '4px', border: '1px solid #eee', borderRadius: 6, textAlign: 'center' }} />
                    </td>
                  )}
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <input type="checkbox" checked={item.retornaInventario}
                      disabled={!activo}
                      onChange={() => toggleRetorna(item.productoId)} />
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>
                    {activo && cant > 0 ? (monto > 0 ? formatCOP(monto) : 'Sin cobro') : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ background: '#fff0f0', borderRadius: 10, padding: '12px 14px', marginBottom: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700 }}>Total a reembolsar:</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#e03a3a' }}>
            {montoTotal > 0 ? formatCOP(montoTotal) : esDebe && totalPagado === 0 ? 'Sin cobro — cancela deuda' : formatCOP(0)}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div className="field">
            <label>Fuente del reembolso</label>
            <select value={fuente} onChange={e => setFuente(e.target.value)}>
              <option>Cashier Check</option>
              <option>Cash</option>
              <option>Zelle</option>
            </select>
          </div>
          <div className="field">
            <label>Observaciones</label>
            <input value={observaciones} onChange={e => setObservations(e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end',
          borderTop: '1px solid #f0f0f0', paddingTop: 14 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger" onClick={guardar} disabled={loading || !puedeConfirmar}>
            {loading ? 'Procesando...' : montoTotal > 0
              ? `↩️ Confirmar reembolso ${formatCOP(montoTotal)}`
              : '↩️ Confirmar devolución'}
          </button>
        </div>
      </div>
    </div>
  );
}