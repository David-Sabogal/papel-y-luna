import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import Factura from '../../components/Factura';
import './Venta.css';

const formatCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

export default function Venta() {
  const navigate = useNavigate();
  const [productos, setProductos]   = useState([]);
  const [busqueda, setBusqueda]     = useState('');
  const [resultados, setResultados] = useState([]);
  const [items, setItems]           = useState([]);
  const [cliente, setCliente]       = useState(null);
  const [clientes, setClientes]     = useState([]);
  const [descuentos, setDescuentos] = useState([]);
  const [descuentoId, setDescuentoId] = useState('');
  const [metodoPago, setMetodoPago] = useState('Cash'); // Cambiado a 'Cash' por defecto
  const [valorRecibido, setValorRecibido] = useState('');
  const [abonoInicial, setAbonoInicial]   = useState('');
  const [ventaGuardada, setVentaGuardada] = useState(null);
  const [ventasAbiertas, setVentasAbiertas] = useState([]);
  const [showVentasAbiertas, setShowVentasAbiertas] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [msg, setMsg]               = useState(null);
  const [ventaCerrada, setVentaCerrada] = useState(null);
  const [showFactura, setShowFactura]   = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [categorias, setCategorias] = useState([]);
  const searchRef = useRef(null);

  // Nuevos estados para Permuta agregados por Claude
  const [permuteCarValue, setPermuteCarValue] = useState('');
  const [permuteExtraMethod, setPermuteExtraMethod] = useState('Cash');

  useEffect(() => { cargarDatos(); searchRef.current?.focus(); }, []);

  const cargarDatos = async () => {
    try {
      const [pRes, cRes, dRes, vaRes, catRes] = await Promise.all([
        client.get('/api/productos'),
        client.get('/api/clientes'),
        client.get('/api/descuentos?activo=true'),
        client.get('/api/ventas?estado=guardada'),
        client.get('/api/categorias'),
      ]);
      setProductos(pRes.data);
      setClientes(cRes.data);
      setDescuentos(dRes.data);
      setVentasAbiertas(vaRes.data);
      setCategorias(catRes.data);
    } catch (err) { console.error(err); }
  };

  const productosFiltrados = productos.filter(p => {
    const matchBusqueda = !busqueda.trim() ||
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigoInterno?.toLowerCase().includes(busqueda.toLowerCase());
    const matchCategoria = !categoriaFiltro || String(p.categoriaId) === String(categoriaFiltro);
    return matchBusqueda && matchCategoria;
  });

  useEffect(() => {
    if (!busqueda.trim()) { setResultados([]); return; }
    setResultados(productosFiltrados.slice(0, 8));
  }, [busqueda, productos, categoriaFiltro]);

  const agregarProducto = (producto) => {
    setBusqueda(''); setResultados([]);
    searchRef.current?.focus();
    setItems(prev => {
      const existe = prev.find(i => i.productoId === producto.id);
      if (existe) return prev.map(i => i.productoId === producto.id
        ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.precioUnitario } : i);
      return [...prev, {
        productoId: producto.id, nombre: producto.nombre,
        precioUnitario: producto.precio, precioOriginal: producto.precio,
        quantity: 1, subtotal: producto.precio,
        stock: producto.stock, trackInventory: producto.trackInventory,
        imagen: producto.imagen,
      }];
    });
  };

  const cambiarCantidad = (productoId, delta) => {
    setItems(prev => prev.map(i => i.productoId === productoId
      ? { ...i, quantity: Math.max(1, i.quantity + delta), subtotal: Math.max(1, i.quantity + delta) * i.precioUnitario }
      : i));
  };

  const cambiarPrecio = (productoId, nuevoPrecio) => {
    const precio = parseFloat(nuevoPrecio) || 0;
    setItems(prev => prev.map(i => i.productoId === productoId
      ? { ...i, precioUnitario: precio, subtotal: precio * i.quantity } : i));
  };

  const eliminarItem = (productoId) => setItems(prev => prev.filter(i => i.productoId !== productoId));

  const limpiarVenta = () => {
    setItems([]); setCliente(null); setDescuentoId('');
    setMetodoPago('Cash'); setValorRecibido(''); setAbonoInicial('');
    setPermuteCarValue(''); setPermuteExtraMethod('Cash');
    setVentaGuardada(null); setBusqueda('');
    searchRef.current?.focus();
  };

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);

  const descuentoValor = (() => {
    if (!descuentoId) return 0;
    const d = descuentos.find(d => d.id === parseInt(descuentoId));
    if (!d) return 0;
    return d.tipo === 'porcentaje' ? subtotal * (d.valor / 100) : d.valor;
  })();

  const total = Math.max(subtotal - descuentoValor, 0);
  const cambio = metodoPago === 'Cash' ? Math.max((parseFloat(valorRecibido) || 0) - total, 0) : 0;
  const saldoDebe = metodoPago === 'Debe' ? Math.max(total - (parseFloat(abonoInicial) || 0), 0) : 0;

  const mostrarMsg = (texto, tipo = 'success') => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg(null), 3500);
  };

  const guardarVenta = async () => {
    if (items.length === 0) return mostrarMsg('Agrega productos primero', 'error');
    setLoading(true);
    try {
      const payload = { items, clienteId: cliente?.id || null, descuentoId: descuentoId || null, estado: 'guardada' };
      if (ventaGuardada) {
        await client.put(`/api/ventas/${ventaGuardada.id}/corregir`, payload);
      } else {
        const { data } = await client.post('/api/ventas', payload);
        setVentaGuardada(data);
      }
      mostrarMsg('Venta guardada — puedes retomar luego');
      cargarDatos();
    } catch (err) { mostrarMsg(err.response?.data?.error || 'Error al guardar', 'error'); }
    finally { setLoading(false); }
  };

  const cobrar = async () => {
    if (items.length === 0) return mostrarMsg('Agrega productos primero', 'error');
    if (metodoPago === 'Cash' && (parseFloat(valorRecibido) || 0) < total) {
      return mostrarMsg('El valor recibido es menor al total', 'error');
    }
    if (metodoPago === 'Debe' && !cliente) {
      return mostrarMsg('Selecciona un cliente para venta a crédito (Debe)', 'error');
    }
    setLoading(true);
    try {
      // Payload modificado con los datos de permuta que dio Claude
      const payload = {
        items, clienteId: cliente?.id || null,
        descuentoId: descuentoId || null,
        metodoPago, valorRecibido: parseFloat(valorRecibido) || 0,
        abonoInicial: parseFloat(abonoInicial) || 0,
        permuteCarValue: metodoPago === 'Permuta' ? parseFloat(permuteCarValue) || 0 : 0,
        permuteExtraMethod: metodoPago === 'Permuta' ? permuteExtraMethod : null,
        estado: 'cerrada',
      };
      
      let data;
      if (ventaGuardada) {
        const res = await client.put(`/api/ventas/${ventaGuardada.id}/corregir`, payload);
        data = res.data;
      } else {
        const res = await client.post('/api/ventas', payload);
        data = res.data;
      }
      setVentaCerrada(data);
      limpiarVenta();
      cargarDatos();
    } catch (err) { mostrarMsg(err.response?.data?.error || 'Error al cobrar', 'error'); }
    finally { setLoading(false); }
  };

  const retomarVenta = (venta) => {
    setVentaGuardada(venta);
    setItems(venta.items.map(i => ({
      productoId: i.productoId, nombre: i.Producto?.nombre || '?',
      precioUnitario: i.price, precioOriginal: i.price,
      quantity: i.quantity, subtotal: i.price * i.quantity,
      imagen: i.Producto?.imagen,
    })));
    setMetodoPago(venta.metodoPago || 'Cash');
    setCliente(venta.Cliente || null);
    setDescuentoId(venta.descuentoId || '');
    setShowVentasAbiertas(false);
    mostrarMsg(`Venta #${venta.id} retomada`);
  };

  if (ventaCerrada) {
    return (
      <div className="cobro-exitoso">
        <div className="cobro-card">
          <div className="cobro-check">✅</div>
          <h2>¡Venta registrada!</h2>
          <p className="cobro-total">{formatCOP(ventaCerrada.total)}</p>
          {ventaCerrada.cambio > 0 && (
            <p className="cobro-cambio">Cambio: <strong>{formatCOP(ventaCerrada.cambio)}</strong></p>
          )}
          {ventaCerrada.saldoDebe > 0 && (
            <p className="cobro-debe">Saldo pendiente: <strong>{formatCOP(ventaCerrada.saldoDebe)}</strong></p>
          )}
          <div className="cobro-acciones">
            <button className="btn btn-primary btn-cobrar" onClick={() => setVentaCerrada(null)}>
              🛒 Nueva venta
            </button>
            <button className="btn btn-secondary" onClick={() => setShowFactura(true)}>
              🧾 Ver factura
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/historial')}>
              📋 Ver historial
            </button>
          </div>
        </div>
        {showFactura && <Factura venta={ventaCerrada} onClose={() => setShowFactura(false)} />}
      </div>
    );
  }

  const tieneItems = items.length > 0;

  return (
    <div className="venta-layout">
      <div className="venta-left">
        <div className="venta-topbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              ref={searchRef}
              className="search-input"
              placeholder="Buscar producto por nombre o código..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              autoComplete="off"
            />
            {resultados.length > 0 && (
              <div className="search-dropdown">
                {resultados.map(p => (
                  <button key={p.id} className="search-result" onClick={() => agregarProducto(p)}>
                    <span className="result-nombre">{p.nombre}</span>
                    <span className="result-precio">{formatCOP(p.precio)}</span>
                    {p.trackInventory && (
                      <span className={`result-stock ${p.stock < 5 ? 'stock-low' : ''}`}>
                        Stock: {p.stock}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          {ventasAbiertas.length > 0 && (
            <button className="btn btn-secondary" onClick={() => setShowVentasAbiertas(!showVentasAbiertas)}>
              📋 ({ventasAbiertas.length})
            </button>
          )}
        </div>

        {showVentasAbiertas && (
          <div className="ventas-abiertas">
            <p className="ventas-abiertas-titulo">Ventas guardadas — toca para retomar</p>
            {ventasAbiertas.map(v => (
              <button key={v.id} className="venta-abierta-item" onClick={() => retomarVenta(v)}>
                <span>#{v.id}</span>
                <span>{v.Cliente?.nombre || 'Sin cliente'}</span>
                <span>{formatCOP(v.total || 0)}</span>
                <span className="va-fecha">{new Date(v.createdAt).toLocaleTimeString()}</span>
              </button>
            ))}
          </div>
        )}

        <div className={`panel-principal ${tieneItems ? 'con-items' : ''}`}>

          {tieneItems && (
            <div className="carrito-section">
              {ventaGuardada && (
                <div className="venta-retomada-badge-inline">🔄 Retomando venta #{ventaGuardada.id}</div>
              )}
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Precio</th>
                    <th>Cant.</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.productoId}>
                      <td className="item-nombre">
                        {item.imagen && (
                          <img src={item.imagen} alt={item.nombre}
                            style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover',
                              marginRight: 8, verticalAlign: 'middle' }}
                            onError={e => e.target.style.display = 'none'} />
                        )}
                        {item.nombre}
                      </td>
                      <td>
                        <input type="number" className="precio-input" value={item.precioUnitario}
                          onChange={e => cambiarPrecio(item.productoId, e.target.value)} min="0" />
                        {item.precioUnitario !== item.precioOriginal && (
                          <span className="precio-editado" title="Precio modificado">✏️</span>
                        )}
                      </td>
                      <td>
                        <div className="qty-ctrl">
                          <button onClick={() => cambiarCantidad(item.productoId, -1)}>−</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => cambiarCantidad(item.productoId, 1)}>+</button>
                        </div>
                      </td>
                      <td className="item-subtotal">{formatCOP(item.subtotal)}</td>
                      <td>
                        <button className="btn-eliminar" onClick={() => eliminarItem(item.productoId)}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="catalogo-section">
            {categorias.length > 0 && (
              <div className="catalogo-categorias">
                <button className={`cat-btn ${!categoriaFiltro ? 'cat-btn-active' : ''}`}
                  onClick={() => setCategoriaFiltro('')}>Todos</button>
                {categorias.map(c => (
                  <button key={c.id}
                    className={`cat-btn ${String(categoriaFiltro) === String(c.id) ? 'cat-btn-active' : ''}`}
                    style={{ borderColor: c.color || '#e0e0e0' }}
                    onClick={() => setCategoriaFiltro(String(c.id))}>
                    {c.icono && <span>{c.icono} </span>}{c.nombre}
                  </button>
                ))}
              </div>
            )}

            <div className="catalogo-grid">
              {productosFiltrados.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#bbb' }}>
                  <p style={{ fontSize: '2rem' }}>📦</p>
                  <p>No hay productos</p>
                </div>
              ) : (
                productosFiltrados.map(p => {
                  const enCarrito = items.find(i => i.productoId === p.id);
                  const sinStock = p.trackInventory && p.stock <= 0;
                  return (
                    <button key={p.id}
                      className={`catalogo-item ${sinStock ? 'sin-stock' : ''} ${enCarrito ? 'en-carrito' : ''}`}
                      onClick={() => !sinStock && agregarProducto(p)}
                      disabled={sinStock}>
                      <div className="catalogo-img-wrap">
                        {p.imagen ? (
                          <img src={p.imagen} alt={p.nombre}
                            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                        ) : null}
                        <div className="catalogo-img-placeholder" style={{ display: p.imagen ? 'none' : 'flex' }}>📦</div>
                        {enCarrito && <div className="catalogo-badge-qty">{enCarrito.quantity}</div>}
                        {sinStock && <div className="catalogo-agotado">Agotado</div>}
                      </div>
                      <div className="catalogo-info">
                        <p className="catalogo-nombre">{p.nombre}</p>
                        <p className="catalogo-precio">{formatCOP(p.precio)}</p>
                        {p.trackInventory && (
                          <p className={`catalogo-stock ${p.stock < 5 ? 'stock-bajo' : ''}`}>
                            Stock: {p.stock}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="venta-right">
        {msg && (
          <div className={`venta-msg ${msg.tipo === 'error' ? 'msg-error' : 'msg-success'}`}>
            {msg.texto}
          </div>
        )}

        <div className="right-section">
          <label className="right-label">
            Cliente {metodoPago === 'Debe' ? '* (requerido)' : '(opcional)'}
          </label>
          <select value={cliente?.id || ''}
            onChange={e => setCliente(clientes.find(c => c.id === parseInt(e.target.value)) || null)}
            style={{ borderColor: metodoPago === 'Debe' && !cliente ? '#e03a3a' : undefined }}>
            <option value="">— Sin cliente —</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>
                {c.nombre}{c.saldoDebe > 0 ? ` (debe ${formatCOP(c.saldoDebe)})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="right-section">
          <label className="right-label">Descuento</label>
          <select value={descuentoId} onChange={e => setDescuentoId(e.target.value)}>
            <option value="">— Sin descuento —</option>
            {descuentos.map(d => (
              <option key={d.id} value={d.id}>
                {d.nombre} ({d.tipo === 'porcentaje' ? `${d.valor}%` : formatCOP(d.valor)})
              </option>
            ))}
          </select>
        </div>

        <div className="totales">
          <div className="total-row"><span>Subtotal</span><span>{formatCOP(subtotal)}</span></div>
          {descuentoValor > 0 && (
            <div className="total-row descuento-row">
              <span>Descuento</span><span>− {formatCOP(descuentoValor)}</span>
            </div>
          )}
          <div className="total-row total-final"><span>TOTAL</span><span>{formatCOP(total)}</span></div>
        </div>

        {/* Bloque de Métodos de Pago y Lógica de Permuta provisto por Claude */}
        <div className="right-section">
          <label className="right-label">Método de pago</label>
          <div className="metodos-pago">
            {['Cash', 'Zelle', 'CVS', 'Cashier Check', 'Permuta', 'Debe'].map(m => (
              <button
                key={m}
                className={`metodo-btn ${metodoPago === m ? 'metodo-active' : ''}`}
                onClick={() => setMetodoPago(m)}
              >{m}</button>
            ))}
          </div>
        </div>

        {metodoPago === 'Cash' && (
          <div className="right-section">
            <label className="right-label">Amount received</label>
            <input type="number" placeholder="0" value={valorRecibido}
              onChange={e => setValorRecibido(e.target.value)} />
            {cambio > 0 && <p className="cambio-text">Change: <strong>{formatCOP(cambio)}</strong></p>}
          </div>
        )}

        {metodoPago === 'Permuta' && (
          <div className="right-section">
            <label className="right-label">🚗 Trade-in vehicle value</label>
            <input type="number" placeholder="0" min="0" value={permuteCarValue}
              onChange={e => setPermuteCarValue(e.target.value)} />
            {permuteCarValue && parseFloat(permuteCarValue) < total && (
              <>
                <p className="cambio-text" style={{ color: '#1565c0', marginTop: 6 }}>
                  Remaining: <strong>{formatCOP(total - parseFloat(permuteCarValue))}</strong>
                </p>
                <label className="right-label" style={{ marginTop: 8 }}>Pay remainder with</label>
                <div className="metodos-pago" style={{ marginTop: 4 }}>
                  {['Cash', 'Zelle', 'CVS', 'Cashier Check'].map(m => (
                    <button key={m}
                      className={`metodo-btn ${permuteExtraMethod === m ? 'metodo-active' : ''}`}
                      onClick={() => setPermuteExtraMethod(m)}
                      style={{ fontSize: '.78rem' }}>{m}</button>
                  ))}
                </div>
              </>
            )}
            {permuteCarValue && parseFloat(permuteCarValue) >= total && (
              <p className="cambio-text" style={{ color: '#2e7d32', marginTop: 6 }}>
                ✅ Trade-in covers full amount
              </p>
            )}
          </div>
        )}

        {metodoPago === 'Debe' && (
          <div className="right-section">
            <label className="right-label">Initial payment (optional)</label>
            <input type="number" placeholder="0" min="0" value={abonoInicial}
              onChange={e => setAbonoInicial(e.target.value)} />
            {saldoDebe > 0 && (
              <p className="cambio-text" style={{ color: '#e03a3a' }}>
                Balance due: <strong>{formatCOP(saldoDebe)}</strong>
              </p>
            )}
          </div>
        )}

        <div className="venta-acciones">
          <button className="btn btn-secondary" onClick={guardarVenta} disabled={loading}>
            💾 Guardar
          </button>
          <button className="btn btn-danger" onClick={limpiarVenta} disabled={loading}>
            🗑 Descartar
          </button>
          <button className="btn btn-primary btn-cobrar" onClick={cobrar}
            disabled={loading || items.length === 0}>
            {loading ? 'Procesando...' : `💳 Cobrar ${formatCOP(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}