import { useState, useEffect, Fragment } from 'react';
import client from '../../api/client';

const formatCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

const emptyItem = { productoId: '', nombreProducto: '', cantidad: 1, costoUnitario: '' };
const emptyProveedor = { nombre: '', nit: '', telefono: '' };
const emptyProductoRapido = { nombre: '', precio: '', costo: '', stock: '' };

export default function Compras() {
  const [compras, setCompras]         = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos]     = useState([]);
  const [showForm, setShowForm]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [detalle, setDetalle]         = useState(null);
  const [msg, setMsg]                 = useState(null);

  // Formulario compra - Estado inicial actualizado a 'Cash'
  const [form, setForm] = useState({
    proveedorId: '', metodoPago: 'Cash', observaciones: '',
    items: [{ ...emptyItem }],
  });

  // Modal proveedor rápido
  const [showProveedorRapido, setShowProveedorRapido] = useState(false);
  const [formProveedor, setFormProveedor] = useState(emptyProveedor);

  // Modal producto rápido
  const [showProductoRapido, setShowProductoRapido] = useState(false);
  const [itemIndexRapido, setItemIndexRapido] = useState(null);
  const [formProductoRapido, setFormProductoRapido] = useState(emptyProductoRapido);

  // Filtros historial
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    const [cRes, pRes, prRes] = await Promise.all([
      client.get('/api/compras'),
      client.get('/api/productos'),
      client.get('/api/proveedores'),
    ]);
    setCompras(cRes.data);
    setProductos(pRes.data);
    setProveedores(prRes.data);
  };

  const mostrarMsg = (texto, tipo = 'success') => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg(null), 3500);
  };

  const agregarItem = () =>
    setForm(f => ({ ...f, items: [...f.items, { ...emptyItem }] }));

  const quitarItem = (i) =>
    setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const cambiarItem = (i, key, val) =>
    setForm(f => ({
      ...f,
      items: f.items.map((item, idx) => idx === i ? { ...item, [key]: val } : item),
    }));

  const seleccionarProducto = (i, productoId) => {
    if (productoId === '__nuevo__') {
      setItemIndexRapido(i);
      setFormProductoRapido(emptyProductoRapido);
      setShowProductoRapido(true);
      return;
    }
    const p = productos.find(p => p.id === parseInt(productoId));
    cambiarItem(i, 'productoId', productoId);
    if (p) cambiarItem(i, 'nombreProducto', p.nombre);
  };

  const total = form.items.reduce((s, i) =>
    s + (parseFloat(i.costoUnitario) || 0) * (parseInt(i.cantidad) || 0), 0);

  const guardarCompra = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await client.post('/api/compras', {
        proveedorId:  form.proveedorId || null,
        metodoPago:   form.metodoPago,
        observaciones: form.observaciones,
        items: form.items.map(i => ({
          productoId:    i.productoId || null,
          nombreProducto: i.nombreProducto || null,
          cantidad:      parseInt(i.cantidad),
          costoUnitario: parseFloat(i.costoUnitario),
        })),
      });
      setShowForm(false);
      setForm({ proveedorId: '', metodoPago: 'Cash', observaciones: '', items: [{ ...emptyItem }] });
      mostrarMsg('✅ Compra registrada correctamente');
      cargar();
    } catch (err) {
      mostrarMsg(err.response?.data?.error || 'Error al registrar compra', 'error');
    } finally { setLoading(false); }
  };

  // RF-92: crear proveedor rápido desde compra
  const crearProveedorRapido = async (e) => {
    e.preventDefault();
    try {
      const { data } = await client.post('/api/proveedores', formProveedor);
      setProveedores(prev => [...prev, data]);
      setForm(f => ({ ...f, proveedorId: String(data.id) }));
      setShowProveedorRapido(false);
      setFormProveedor(emptyProveedor);
      mostrarMsg(`Proveedor "${data.nombre}" creado y seleccionado`);
    } catch (err) {
      mostrarMsg(err.response?.data?.error || 'Error al crear proveedor', 'error');
    }
  };

  // RF-94: crear producto rápido desde compra
  const crearProductoRapido = async (e) => {
    e.preventDefault();
    try {
      const costoDelItem = parseFloat(form.items[itemIndexRapido]?.costoUnitario) || 0;
      const { data } = await client.post('/api/productos', {
        nombre: formProductoRapido.nombre,
        precio: parseFloat(formProductoRapido.precio) || 0,
        costo:  costoDelItem, // toma el costo unitario de la línea de compra
        stock:  0,
      });
      setProductos(prev => [...prev, data]);
      if (itemIndexRapido !== null) {
        cambiarItem(itemIndexRapido, 'productoId', String(data.id));
        cambiarItem(itemIndexRapido, 'nombreProducto', data.nombre);
      }
      setShowProductoRapido(false);
      setFormProductoRapido(emptyProductoRapido);
      setItemIndexRapido(null);
      mostrarMsg(`Producto "${data.nombre}" creado y agregado`);
    } catch (err) {
      mostrarMsg(err.response?.data?.error || 'Error al crear producto', 'error');
    }
  };

  // Filtrar compras
  const comprasFiltradas = compras.filter(c => {
    const matchProveedor = !filtroProveedor || String(c.proveedorId) === filtroProveedor;
    const matchDesde = !desde || new Date(c.createdAt) >= new Date(desde);
    const matchHasta = !hasta || new Date(c.createdAt) <= new Date(hasta + 'T23:59:59');
    return matchProveedor && matchDesde && matchHasta;
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🚚 Compras</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nueva compra</button>
      </div>

      {msg && (
        <div className={`productos-msg ${msg.tipo === 'error' ? 'msg-error' : 'msg-success'}`}
          style={{ marginBottom: 14 }}>
          {msg.texto}
        </div>
      )}

      {/* Filtros historial */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filtroProveedor} onChange={e => setFiltroProveedor(e.target.value)}
          style={{ width: 'auto', minWidth: 160 }}>
          <option value="">Todos los proveedores</option>
          {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
          style={{ width: 'auto' }} />
        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
          style={{ width: 'auto' }} />
        <button className="btn btn-secondary"
          onClick={() => { setFiltroProveedor(''); setDesde(''); setHasta(''); }}>
          Limpiar
        </button>
      </div>

      {/* Tabla historial */}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Fecha</th><th>Proveedor</th>
              <th>Total</th><th>Método</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {comprasFiltradas.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#bbb' }}>
                No hay compras registradas
              </td></tr>
            ) : comprasFiltradas.map(c => {
              const mostrandoDetalle = detalle?.id === c.id;
              return (
                <Fragment key={c.id}>
                  <tr style={{ background: mostrandoDetalle ? '#f6fdf9' : undefined }}>
                    <td><strong>#{c.id}</strong></td>
                    <td>{new Date(c.createdAt).toLocaleDateString('es-CO')}</td>
                    <td>{c.Proveedor?.nombre || <span style={{ color: '#bbb' }}>Sin proveedor</span>}</td>
                    <td><strong>{formatCOP(c.total)}</strong></td>
                    <td>{c.metodoPago}</td>
                    <td>
                      <button className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '.78rem' }}
                        onClick={() => setDetalle(mostrandoDetalle ? null : c)}>
                        {mostrandoDetalle ? '▲ Ocultar' : '▼ Ver'}
                      </button>
                    </td>
                  </tr>

                  {mostrandoDetalle && (
                    <tr key={`detalle-${c.id}`}>
                      <td colSpan={6} style={{ padding: 0 }}>
                        <div className="detalle-inline">
                          <table className="detalle-tabla">
                            <thead>
                              <tr>
                                <th>Producto</th>
                                <th>Cantidad</th>
                                <th>Costo unit.</th>
                                <th>Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {c.CompraItems?.map(i => (
                                <tr key={i.id}>
                                  <td>{i.Producto?.nombre || i.nombreProducto || '—'}</td>
                                  <td>{i.cantidad}</td>
                                  <td>{formatCOP(i.costoUnitario)}</td>
                                  <td>{formatCOP(i.subtotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {c.observaciones && (
                            <p style={{ fontSize: '.84rem', color: '#888', marginTop: 6 }}>
                              Obs: {c.observaciones}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detalle compra */}
      {detalle && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12, fontSize: '1rem', fontWeight: 700 }}>
            Detalle — Compra #{detalle.id}
          </h3>
          <table>
            <thead>
              <tr><th>Producto</th><th>Cantidad</th><th>Costo unit.</th><th>Subtotal</th></tr>
            </thead>
            <tbody>
              {detalle.CompraItems?.map(i => (
                <tr key={i.id}>
                  <td>{i.Producto?.nombre || i.nombreProducto || '—'}</td>
                  <td>{i.cantidad}</td>
                  <td>{formatCOP(i.costoUnitario)}</td>
                  <td>{formatCOP(i.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {detalle.observaciones && (
            <p style={{ marginTop: 10, fontSize: '.86rem', color: '#888' }}>
              Obs: {detalle.observaciones}
            </p>
          )}
        </div>
      )}

      {/* Modal nueva compra */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 660, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>Nueva compra</h3>
            <form onSubmit={guardarCompra} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Proveedor + botón crear rápido */}
              <div className="field">
                <label>Proveedor</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={form.proveedorId}
                    onChange={e => setForm({ ...form, proveedorId: e.target.value })}
                    style={{ flex: 1 }}>
                    <option value="">— Sin proveedor —</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  <button type="button" className="btn btn-secondary"
                    style={{ whiteSpace: 'nowrap', fontSize: '.8rem' }}
                    onClick={() => { setFormProveedor(emptyProveedor); setShowProveedorRapido(true); }}>
                    + Nuevo proveedor
                  </button>
                </div>
              </div>

              {/* Selector modificado con los nuevos métodos sugeridos por Claude */}
              <div className="field">
                <label>Método de pago *</label>
                <select value={form.metodoPago}
                  onChange={e => setForm({ ...form, metodoPago: e.target.value })}>
                  <option>Cash</option>
                  <option>Cashier Check</option>
                  <option>Adesa</option>
                  <option>Manheim</option>
                  <option>Copart</option>
                  <option>IAA</option>
                </select>
              </div>

              <div className="field">
                <label>Observaciones</label>
                <textarea rows={2} value={form.observaciones}
                  onChange={e => setForm({ ...form, observaciones: e.target.value })} />
              </div>

              {/* Items */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontWeight: 700 }}>Productos de la compra</label>
                  <button type="button" className="btn btn-secondary"
                    style={{ fontSize: '.78rem', padding: '4px 12px' }}
                    onClick={agregarItem}>+ Agregar línea</button>
                </div>

                {form.items.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                    <div>
                      <select value={item.productoId}
                        onChange={e => seleccionarProducto(i, e.target.value)}>
                        <option value="">— Seleccionar producto —</option>
                        <option value="__nuevo__">✚ Crear producto nuevo...</option>
                        {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </div>
                    <input type="number" min="1" placeholder="Cant."
                      value={item.cantidad}
                      onChange={e => cambiarItem(i, 'cantidad', e.target.value)} />
                    <input type="number" min="0" placeholder="Costo unit."
                      value={item.costoUnitario}
                      onChange={e => cambiarItem(i, 'costoUnitario', e.target.value)} />
                    {form.items.length > 1 && (
                      <button type="button" className="btn btn-danger"
                        style={{ padding: '6px 10px' }} onClick={() => quitarItem(i)}>🗑</button>
                    )}
                  </div>
                ))}

                <p style={{ textAlign: 'right', fontWeight: 700, color: '#1a1a2e', marginTop: 8 }}>
                  Total: {formatCOP(total)}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end',
                borderTop: '1px solid #f0f0f0', paddingTop: 14 }}>
                <button type="button" className="btn btn-secondary"
                  onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Registrando...' : '✅ Registrar compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal proveedor rápido (RF-92) */}
      {showProveedorRapido && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-box" style={{ maxWidth: 400 }}>
            <h3>➕ Nuevo proveedor</h3>
            <p style={{ color: '#888', fontSize: '.84rem', margin: '6px 0 14px' }}>
              Registro rápido — podrás completar más datos desde la sección Proveedores.
            </p>
            <form onSubmit={crearProveedorRapido}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field"><label>Nombre *</label>
                <input required value={formProveedor.nombre}
                  onChange={e => setFormProveedor({ ...formProveedor, nombre: e.target.value })}
                  autoFocus />
              </div>
              <div className="field"><label>NIT</label>
                <input value={formProveedor.nit}
                  onChange={e => setFormProveedor({ ...formProveedor, nit: e.target.value })} />
              </div>
              <div className="field"><label>Teléfono</label>
                <input value={formProveedor.telefono}
                  onChange={e => setFormProveedor({ ...formProveedor, telefono: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn btn-secondary"
                  onClick={() => setShowProveedorRapido(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear proveedor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal producto rápido (RF-94) */}
      {showProductoRapido && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-box" style={{ maxWidth: 400 }}>
            <h3>➕ Nuevo producto</h3>
            <p style={{ color: '#888', fontSize: '.84rem', margin: '6px 0 14px' }}>
              Registro rápido — el stock se actualizará automáticamente con la cantidad que ingreses en esta compra.
              Puedes completar más datos desde la sección Productos.
            </p>
            <form onSubmit={crearProductoRapido}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field"><label>Nombre *</label>
                <input required value={formProductoRapido.nombre}
                  onChange={e => setFormProductoRapido({ ...formProductoRapido, nombre: e.target.value })}
                  autoFocus />
              </div>
              <div className="field"><label>Precio de venta *</label>
                <input required type="number" min="0" placeholder="¿A cuánto lo vendes?"
                  value={formProductoRapido.precio}
                  onChange={e => setFormProductoRapido({ ...formProductoRapido, precio: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn btn-secondary"
                  onClick={() => setShowProductoRapido(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear producto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}