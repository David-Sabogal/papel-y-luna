import { useState, useEffect } from 'react';
import client from '../api/client';

const formatCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

export default function CorreccionVenta({ venta, onClose }) {
  const [items, setItems]       = useState([]);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [descuentos, setDescuentos] = useState([]);
  const [clienteId, setClienteId]   = useState(venta.clienteId || '');
  const [descuentoId, setDescuentoId] = useState(venta.descuentoId || '');
  const [metodoPago, setMetodoPago]   = useState(venta.metodoPago || 'Efectivo');
  const [valorRecibido, setValorRecibido] = useState(venta.valorRecibido || '');
  const [abonoInicial, setAbonoInicial]   = useState('');
  const [busqueda, setBusqueda]   = useState('');
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState('');

  useEffect(() => {
    setItems(venta.items.map(i => ({
      productoId: i.productoId, nombre: i.Producto?.nombre || '?',
      precioUnitario: i.price, quantity: i.quantity, subtotal: i.price * i.quantity,
    })));
    Promise.all([
      client.get('/api/productos'),
      client.get('/api/clientes'),
      client.get('/api/descuentos?activo=true'),
    ]).then(([p, c, d]) => { setProductos(p.data); setClientes(c.data); setDescuentos(d.data); });
  }, []);

  useEffect(() => {
    if (!busqueda.trim()) { setResultados([]); return; }
    const q = busqueda.toLowerCase();
    setResultados(productos.filter(p => p.nombre?.toLowerCase().includes(q)).slice(0, 6));
  }, [busqueda, productos]);

  const agregarProducto = (p) => {
    setBusqueda(''); setResultados([]);
    setItems(prev => {
      const existe = prev.find(i => i.productoId === p.id);
      if (existe) return prev.map(i => i.productoId === p.id
        ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.precioUnitario } : i);
      return [...prev, { productoId: p.id, nombre: p.nombre, precioUnitario: p.precio, quantity: 1, subtotal: p.precio }];
    });
  };

  const cambiarCantidad = (id, delta) => setItems(prev => prev.map(i =>
    i.productoId === id ? { ...i, quantity: Math.max(1, i.quantity + delta), subtotal: Math.max(1, i.quantity + delta) * i.precioUnitario } : i));

  const cambiarPrecio = (id, val) => {
    const p = parseFloat(val) || 0;
    setItems(prev => prev.map(i => i.productoId === id ? { ...i, precioUnitario: p, subtotal: p * i.quantity } : i));
  };

  const eliminar = (id) => setItems(prev => prev.filter(i => i.productoId !== id));

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const descuentoValor = (() => {
    if (!descuentoId) return 0;
    const d = descuentos.find(d => d.id === parseInt(descuentoId));
    if (!d) return 0;
    return d.tipo === 'porcentaje' ? subtotal * (d.valor / 100) : d.valor;
  })();
  const total = Math.max(subtotal - descuentoValor, 0);
  const saldoDebe = metodoPago === 'Debe' ? Math.max(total - (parseFloat(abonoInicial) || 0), 0) : 0;

  const guardar = async () => {
    if (items.length === 0) return setMsg('Agrega al menos un producto');
    setLoading(true);
    try {
      await client.put(`/api/ventas/${venta.id}/corregir`, {
        items, clienteId: clienteId || null, descuentoId: descuentoId || null,
        metodoPago, valorRecibido: parseFloat(valorRecibido) || 0,
        abonoInicial: parseFloat(abonoInicial) || 0,
      });
      onClose();
    } catch (err) { setMsg(err.response?.data?.error || 'Error al corregir'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3>✏️ Corregir venta #{venta.id}</h3>
        {msg && <p style={{ color: '#e03a3a', fontSize: '.86rem', margin: '8px 0' }}>{msg}</p>}

        {/* Buscar producto */}
        <div style={{ position: 'relative', marginTop: 14, marginBottom: 10 }}>
          <input placeholder="Agregar producto..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)} />
          {resultados.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff',
              border: '1px solid #eee', borderRadius: 8, zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,.1)' }}>
              {resultados.map(p => (
                <button key={p.id} onClick={() => agregarProducto(p)}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: '.86rem' }}>
                  <span>{p.nombre}</span>
                  <span style={{ color: '#e28a85', fontWeight: 700 }}>{formatCOP(p.precio)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: '.76rem' }}>Producto</th>
              <th style={{ padding: '8px', fontSize: '.76rem' }}>Precio</th>
              <th style={{ padding: '8px', fontSize: '.76rem' }}>Cant.</th>
              <th style={{ padding: '8px', fontSize: '.76rem' }}>Subtotal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.productoId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px', fontSize: '.86rem' }}>{item.nombre}</td>
                <td style={{ padding: '8px' }}>
                  <input type="number" value={item.precioUnitario} min="0"
                    onChange={e => cambiarPrecio(item.productoId, e.target.value)}
                    style={{ width: 90, padding: '4px 6px', border: '1px solid #eee', borderRadius: 6 }} />
                </td>
                <td style={{ padding: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => cambiarCantidad(item.productoId, -1)}
                      style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #ddd', cursor: 'pointer', background: '#f9f9f9' }}>−</button>
                    <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 600 }}>{item.quantity}</span>
                    <button onClick={() => cambiarCantidad(item.productoId, 1)}
                      style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #ddd', cursor: 'pointer', background: '#f9f9f9' }}>+</button>
                  </div>
                </td>
                <td style={{ padding: '8px', fontWeight: 600 }}>{formatCOP(item.subtotal)}</td>
                <td style={{ padding: '8px' }}>
                  <button onClick={() => eliminar(item.productoId)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Subtotal</span><span>{formatCOP(subtotal)}</span>
          </div>
          {descuentoValor > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2e7d32', marginBottom: 4 }}>
              <span>Descuento</span><span>− {formatCOP(descuentoValor)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.05rem', borderTop: '1px solid #eee', paddingTop: 8, marginTop: 4 }}>
            <span>TOTAL</span><span>{formatCOP(total)}</span>
          </div>
        </div>

        {/* Campos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div className="field"><label>Cliente</label>
            <select value={clienteId} onChange={e => setClienteId(e.target.value)}>
              <option value="">— Sin cliente —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="field"><label>Descuento</label>
            <select value={descuentoId} onChange={e => setDescuentoId(e.target.value)}>
              <option value="">— Sin descuento —</option>
              {descuentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>
          <div className="field"><label>Método de pago</label>
            <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
              {['Cash', 'Zelle', 'CVS', 'Cashier Check', 'Permuta', 'Debe'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          {metodoPago === 'Efectivo' && (
            <div className="field"><label>Valor recibido</label>
              <input type="number" value={valorRecibido} onChange={e => setValorRecibido(e.target.value)} />
            </div>
          )}
          {metodoPago === 'Debe' && (
            <div className="field"><label>Abono inicial</label>
              <input type="number" value={abonoInicial} onChange={e => setAbonoInicial(e.target.value)} />
              {saldoDebe > 0 && <small style={{ color: '#e03a3a' }}>Saldo: {formatCOP(saldoDebe)}</small>}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #f0f0f0', paddingTop: 14 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={guardar} disabled={loading}>
            {loading ? 'Guardando...' : '✅ Guardar corrección'}
          </button>
        </div>
      </div>
    </div>
  );
}