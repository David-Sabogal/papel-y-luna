import { useState, useEffect } from 'react';
import client from '../../api/client';
import Factura from '../../components/Factura';
import CorreccionVenta from '../../components/CorreccionVenta';
import ReembolsoVenta from '../../components/ReembolsoVenta';
import { useAuth } from '../../context/AuthContext';
import './Historial.css';

const formatCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

const estadoBadge = {
  abierta:  'badge badge-blue',
  guardada: 'badge badge-yellow',
  cerrada:  'badge badge-green',
  anulada:  'badge badge-red',
};

export default function Historial() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [ventas, setVentas]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPago, setFiltroPago] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [desde, setDesde]           = useState('');
  const [hasta, setHasta]           = useState('');
  const [clientes, setClientes]     = useState([]);
  const [detalleId, setDetalleId]   = useState(null);
  const [showFactura, setShowFactura]     = useState(null);
  const [showCorreccion, setShowCorreccion] = useState(null);
  const [showReembolso, setShowReembolso]   = useState(null);
  const [showAnular, setShowAnular] = useState(null);
  const [showAbono, setShowAbono]   = useState(null);
  const [abonoVal, setAbonoVal]     = useState('');
  const [motivo, setMotivo]         = useState('');

  useEffect(() => { cargar(); }, [filtroEstado, filtroPago, filtroCliente, desde, hasta]);
  useEffect(() => {
    client.get('/api/clientes').then(r => setClientes(r.data)).catch(() => {});
  }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado)  params.append('estado', filtroEstado);
      if (filtroPago)    params.append('metodoPago', filtroPago);
      if (filtroCliente) params.append('clienteId', filtroCliente);
      if (desde)         params.append('desde', desde);
      if (hasta)         params.append('hasta', hasta);
      const { data } = await client.get(`/api/ventas?${params}`);
      setVentas(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const anular = async (id) => {
    try {
      await client.patch(`/api/ventas/${id}/anular`, { motivo });
      setShowAnular(null); setMotivo(''); cargar();
    } catch (err) { alert(err.response?.data?.error || 'Error al anular'); }
  };

  const registrarAbono = async (ventaId) => {
    if (!abonoVal || parseFloat(abonoVal) <= 0) return alert('Ingresa un valor válido');
    try {
      await client.patch(`/api/ventas/${ventaId}/abono`, { abono: parseFloat(abonoVal) });
      setShowAbono(null); setAbonoVal(''); cargar();
    } catch (err) { alert(err.response?.data?.error || 'Error al registrar abono'); }
  };

  const toggleDetalle = (id) => setDetalleId(prev => prev === id ? null : id);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📋 Historial de Ventas</h1>
      </div>

      <div className="card historial-filtros">
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="abierta">Abierta</option>
          <option value="guardada">Guardada</option>
          <option value="cerrada">Cerrada</option>
          <option value="anulada">Anulada</option>
        </select>
        <select value={filtroPago} onChange={e => setFiltroPago(e.target.value)}>
          <option value="">Todos los pagos</option>
          <option value="Cash">Cash</option>
          <option value="Zelle">Zelle</option>
           <option value="CVS">CVS</option>
           <option value="Cashier Check">Cashier Check</option>
           <option value="Permuta">Permuta</option>
          <option value="Debe">Debe</option>
        </select>
        <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
          <option value="">Todos los clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
        <button className="btn btn-secondary" onClick={() => {
          setFiltroEstado(''); setFiltroPago(''); setFiltroCliente('');
          setDesde(''); setHasta('');
        }}>Limpiar</button>
      </div>

      <div className="card table-wrap" style={{ marginTop: 16 }}>
        {loading ? (
          <p style={{ padding: 20, color: '#888' }}>Cargando...</p>
        ) : ventas.length === 0 ? (
          <p style={{ padding: 20, color: '#888' }}>No hay ventas.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Pago</th>
                <th>Saldo</th>
                <th>Estado</th>
                {isAdmin && <th>Corregida</th>}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map(v => {
                const noAnulada  = v.estado !== 'anulada';
                const esCerrada  = v.estado === 'cerrada';
                const tieneSaldo = v.saldoDebe > 0 && esCerrada;
                const mostrandoDetalle = detalleId === v.id;

                return (
                  <>
                    <tr key={v.id} style={{ background: mostrandoDetalle ? '#fdf6f6' : undefined }}>
                      <td><strong>#{v.id}</strong></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(v.createdAt).toLocaleString('es-CO')}
                      </td>
                      <td>{v.Cliente?.nombre || <span style={{ color: '#bbb' }}>—</span>}</td>
                      <td><strong>{formatCOP(v.total)}</strong></td>
                      <td>{v.metodoPago || '—'}</td>
                      <td>
                        {v.saldoDebe > 0
                          ? <span className="badge badge-red">{formatCOP(v.saldoDebe)}</span>
                          : <span className="badge badge-green">Al día</span>}
                      </td>
                      <td>
                        <span className={estadoBadge[v.estado] || 'badge badge-gray'}>
                          {v.estado}
                        </span>
                      </td>
                      {isAdmin && (
                        <td>
                          {v.fueCOrregida
                            ? <span className="badge badge-yellow"
                                title={`Por: ${v.Usuario?.username || '?'}`}>✏️ Sí</span>
                            : <span style={{ color: '#bbb' }}>—</span>}
                        </td>
                      )}
                      <td>
                        <div className="historial-acciones">
                          <button className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '.76rem' }}
                            onClick={() => toggleDetalle(v.id)}>
                            {mostrandoDetalle ? '▲ Ocultar' : '▼ Ver'}
                          </button>
                          {noAnulada && (
                            <button className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '.76rem' }}
                              onClick={() => setShowFactura(v)}>🧾</button>
                          )}
                          {isAdmin && noAnulada && (
                            <button className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '.76rem' }}
                              onClick={() => setShowCorreccion(v)}>✏️</button>
                          )}
                          {isAdmin && esCerrada && (
                            <button className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '.76rem' }}
                              onClick={() => setShowReembolso(v)}>↩️</button>
                          )}
                          {tieneSaldo && (
                            <button className="btn btn-success"
                              style={{ padding: '4px 8px', fontSize: '.76rem' }}
                              onClick={() => { setShowAbono(v); setAbonoVal(''); }}>
                              💰 Abono
                            </button>
                          )}
                          {isAdmin && noAnulada && (
                            <button className="btn btn-danger"
                              style={{ padding: '4px 8px', fontSize: '.76rem' }}
                              onClick={() => setShowAnular(v)}>🗑</button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Detalle inline justo debajo de esta fila */}
                    {mostrandoDetalle && (
                      <tr key={`detalle-${v.id}`}>
                        <td colSpan={isAdmin ? 9 : 8} style={{ padding: 0 }}>
                          <div className="detalle-inline">
                            <table className="detalle-tabla">
                              <thead>
                                <tr>
                                  <th>Producto</th>
                                  <th>Precio unit.</th>
                                  <th>Cant.</th>
                                  <th>Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {v.items?.map((item, idx) => (
                                  <tr key={idx}>
                                    <td>
                                      {item.Producto?.nombre || item.nombreProducto
                                        ? (item.Producto?.nombre || item.nombreProducto) +
                                          (item.productoId === null ? ' (eliminado)' : '')
                                        : '(producto eliminado)'}
                                    </td>
                                    <td>{formatCOP(item.price)}</td>
                                    <td>{item.quantity}</td>
                                    <td>{formatCOP(item.subtotal)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="detalle-totales">
                              <span>Subtotal: {formatCOP(v.subtotal)}</span>
                              {v.descuentoValor > 0 && (
                                <span style={{ color: '#2e7d32' }}>Descuento: − {formatCOP(v.descuentoValor)}</span>
                              )}
                              <strong>Total: {formatCOP(v.total)}</strong>
                              {v.saldoDebe > 0 && (
                                <span className="badge badge-red">Debe: {formatCOP(v.saldoDebe)}</span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal abono */}
      {showAbono && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>💰 Registrar abono — Venta #{showAbono.id}</h3>
            <p style={{ color: '#888', fontSize: '.88rem', margin: '8px 0 14px' }}>
              Saldo pendiente: <strong style={{ color: '#e03a3a' }}>{formatCOP(showAbono.saldoDebe)}</strong>
            </p>
            <div className="field">
              <label>Valor del abono</label>
              <input type="number" min="1" max={showAbono.saldoDebe}
                placeholder="0" value={abonoVal}
                onChange={e => setAbonoVal(e.target.value)} autoFocus />
            </div>
            {abonoVal && parseFloat(abonoVal) >= showAbono.saldoDebe && (
              <p style={{ color: '#2e7d32', fontSize: '.84rem', marginTop: 6 }}>
                ✅ Saldo quedará en $0
              </p>
            )}
            {abonoVal && parseFloat(abonoVal) < showAbono.saldoDebe && parseFloat(abonoVal) > 0 && (
              <p style={{ color: '#888', fontSize: '.84rem', marginTop: 6 }}>
                Saldo restante: {formatCOP(showAbono.saldoDebe - parseFloat(abonoVal))}
              </p>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setShowAbono(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => registrarAbono(showAbono.id)}>
                Confirmar abono
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal anular */}
      {showAnular && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Anular venta #{showAnular.id}</h3>
            <p style={{ color: '#888', fontSize: '.88rem', margin: '8px 0 14px' }}>
              Esta acción restaura el stock. No se puede deshacer.
            </p>
            <textarea placeholder="Motivo de anulación (opcional)"
              value={motivo} onChange={e => setMotivo(e.target.value)}
              rows={3} style={{ marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAnular(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => anular(showAnular.id)}>
                Confirmar anulación
              </button>
            </div>
          </div>
        </div>
      )}

      {showFactura && <Factura venta={showFactura} onClose={() => setShowFactura(null)} />}
      {showCorreccion && (
        <CorreccionVenta venta={showCorreccion}
          onClose={() => { setShowCorreccion(null); cargar(); }} />
      )}
      {showReembolso && (
        <ReembolsoVenta venta={showReembolso}
          onClose={() => { setShowReembolso(null); cargar(); }} />
      )}
    </div>
  );
}