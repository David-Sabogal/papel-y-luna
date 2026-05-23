import { useState, useEffect } from 'react';
import client from '../../api/client';

const empty = { nombreProducto: '', tipo: 'agotado', cantidad: '', observacion: '' };
const estadoBadge = { pendiente: 'badge-yellow', resuelto: 'badge-green', descartado: 'badge-gray' };

export default function Faltantes() {
  const [faltantes, setFaltantes]   = useState([]);
  const [reporte, setReporte]       = useState([]);
  const [form, setForm]             = useState(empty);
  const [showForm, setShowForm]     = useState(false);
  const [showReporte, setShowReporte] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('pendiente');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [desde, setDesde]           = useState('');
  const [hasta, setHasta]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [msg, setMsg]               = useState(null);

  // RF-156: crear producto rápido desde faltante no registrado
  const [showCrearProducto, setShowCrearProducto] = useState(false);
  const [faltanteParaProducto, setFaltanteParaProducto] = useState(null);
  const [formProducto, setFormProducto] = useState({ nombre: '', precio: '', stock: '' });

  useEffect(() => { cargar(); }, [filtroEstado, filtroTipo, desde, hasta]);

  const cargar = async () => {
    const params = new URLSearchParams();
    if (filtroEstado) params.append('estado', filtroEstado);
    if (filtroTipo)   params.append('tipo', filtroTipo);
    if (desde)        params.append('desde', desde);
    if (hasta)        params.append('hasta', hasta);
    const { data } = await client.get(`/api/faltantes?${params}`);
    setFaltantes(data);
  };

  const cargarReporte = async () => {
    const { data } = await client.get('/api/faltantes/reporte');
    setReporte(data);
    setShowReporte(true);
  };

  const mostrarMsg = (texto, tipo = 'success') => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg(null), 3500);
  };

  const guardar = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await client.post('/api/faltantes', {
        ...form, cantidad: parseInt(form.cantidad) || null,
      });
      setShowForm(false); setForm(empty);
      mostrarMsg('Faltante registrado');
      cargar();
    } catch (err) {
      mostrarMsg(err.response?.data?.error || 'Error', 'error');
    } finally { setLoading(false); }
  };

  const cambiarEstado = async (id, estado) => {
    await client.patch(`/api/faltantes/${id}/estado`, { estado });
    mostrarMsg(estado === 'resuelto' ? '✅ Marcado como resuelto' : 'Estado actualizado');
    cargar();
  };

  // RF-156: crear producto desde faltante no registrado
  const abrirCrearProducto = (faltante) => {
    setFaltanteParaProducto(faltante);
    setFormProducto({ nombre: faltante.nombreProducto, precio: '', stock: '' });
    setShowCrearProducto(true);
  };

  const crearProductoDesde = async (e) => {
    e.preventDefault();
    try {
      await client.post('/api/productos', {
        nombre: formProducto.nombre,
        precio: parseFloat(formProducto.precio),
        stock:  parseFloat(formProducto.stock) || 0,
      });
      // Marcar faltante como resuelto automáticamente
      await client.patch(`/api/faltantes/${faltanteParaProducto.id}/estado`, { estado: 'resuelto' });
      setShowCrearProducto(false);
      mostrarMsg(`✅ Producto "${formProducto.nombre}" creado y faltante marcado como resuelto`);
      cargar();
    } catch (err) {
      mostrarMsg(err.response?.data?.error || 'Error al crear producto', 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">⚠️ Faltantes</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={cargarReporte}>📊 Reporte</button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Registrar</button>
        </div>
      </div>

      {msg && (
        <div className={`productos-msg ${msg.tipo === 'error' ? 'msg-error' : 'msg-success'}`}
          style={{ marginBottom: 14 }}>
          {msg.texto}
        </div>
      )}

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ width: 'auto' }}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="resuelto">Resuelto</option>
          <option value="descartado">Descartado</option>
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          style={{ width: 'auto' }}>
          <option value="">Todos los tipos</option>
          <option value="agotado">Agotado</option>
          <option value="no_registrado">No registrado</option>
        </select>
        <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
          style={{ width: 'auto' }} />
        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
          style={{ width: 'auto' }} />
        <button className="btn btn-secondary"
          onClick={() => { setFiltroEstado(''); setFiltroTipo(''); setDesde(''); setHasta(''); }}>
          Limpiar
        </button>
      </div>

      {/* Tabla faltantes */}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Producto</th><th>Tipo</th><th>Cant.</th>
              <th>Observación</th><th>Estado</th><th>Fecha</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {faltantes.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#bbb' }}>
                No hay faltantes
              </td></tr>
            ) : faltantes.map(f => (
              <tr key={f.id}>
                <td><strong>{f.nombreProducto}</strong></td>
                <td>
                  <span className={`badge ${f.tipo === 'agotado' ? 'badge-red' : 'badge-blue'}`}>
                    {f.tipo === 'agotado' ? 'Agotado' : 'No registrado'}
                  </span>
                </td>
                <td>{f.cantidad || '—'}</td>
                <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.observacion || '—'}
                </td>
                <td>
                  <span className={`badge ${estadoBadge[f.estado]}`}>{f.estado}</span>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {new Date(f.createdAt).toLocaleDateString('es-CO')}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {f.estado === 'pendiente' && (
                      <>
                        <button className="btn btn-success"
                          style={{ padding: '4px 8px', fontSize: '.76rem' }}
                          onClick={() => cambiarEstado(f.id, 'resuelto')}>
                          ✓ Resuelto
                        </button>
                        {f.tipo === 'no_registrado' && (
                          <button className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '.76rem' }}
                            onClick={() => abrirCrearProducto(f)}
                            title="Crear producto en catálogo">
                            📦 Crear
                          </button>
                        )}
                        <button className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '.76rem' }}
                          onClick={() => cambiarEstado(f.id, 'descartado')}>
                          Descartar
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal reporte RF-155 */}
      {showReporte && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 640, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>📊 Reporte de faltantes frecuentes</h3>
              <button className="btn btn-secondary" style={{ padding: '4px 12px' }}
                onClick={() => setShowReporte(false)}>✕ Cerrar</button>
            </div>
            {reporte.length === 0 ? (
              <p style={{ color: '#bbb', textAlign: 'center', padding: 24 }}>No hay faltantes registrados</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Producto solicitado</th>
                    <th>Veces solicitado</th>
                    <th>Cantidad total</th>
                    <th>Última solicitud</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.map((r, i) => (
                    <tr key={i}>
                      <td><strong>{i + 1}</strong></td>
                      <td>{r.nombreProducto}</td>
                      <td>
                        <span className="badge badge-blue">{r.veces} vez{r.veces > 1 ? 'es' : ''}</span>
                      </td>
                      <td>{r.cantidadTotal > 0 ? r.cantidadTotal : '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(r.ultimaFecha).toLocaleDateString('es-CO')}
                      </td>
                      <td>
                        <span className={`badge ${estadoBadge[r.estado] || 'badge-gray'}`}>
                          {r.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal registrar faltante */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Registrar faltante</h3>
            <form onSubmit={guardar}
              style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field"><label>Producto *</label>
                <input required value={form.nombreProducto}
                  onChange={e => setForm({ ...form, nombreProducto: e.target.value })}
                  placeholder="Nombre del producto solicitado" />
              </div>
              <div className="field"><label>Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  <option value="agotado">Agotado (existe pero sin stock)</option>
                  <option value="no_registrado">No registrado (no existe en catálogo)</option>
                </select>
              </div>
              <div className="field"><label>Cantidad aproximada (opcional)</label>
                <input type="number" min="1" value={form.cantidad}
                  onChange={e => setForm({ ...form, cantidad: e.target.value })} />
              </div>
              <div className="field"><label>Observación (opcional)</label>
                <textarea rows={2} value={form.observacion}
                  onChange={e => setForm({ ...form, observacion: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-secondary"
                  onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal crear producto desde faltante RF-156 */}
      {showCrearProducto && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-box" style={{ maxWidth: 400 }}>
            <h3>📦 Crear producto en catálogo</h3>
            <p style={{ color: '#888', fontSize: '.84rem', margin: '6px 0 14px' }}>
              Basado en el faltante "<strong>{faltanteParaProducto?.nombreProducto}</strong>".
              El faltante quedará marcado como resuelto automáticamente.
            </p>
            <form onSubmit={crearProductoDesde}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field"><label>Nombre *</label>
                <input required value={formProducto.nombre}
                  onChange={e => setFormProducto({ ...formProducto, nombre: e.target.value })} />
              </div>
              <div className="field"><label>Precio de venta *</label>
                <input required type="number" min="0" value={formProducto.precio}
                  onChange={e => setFormProducto({ ...formProducto, precio: e.target.value })} />
              </div>
              <div className="field"><label>Stock inicial</label>
                <input type="number" min="0" value={formProducto.stock}
                  onChange={e => setFormProducto({ ...formProducto, stock: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn btn-secondary"
                  onClick={() => setShowCrearProducto(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear y resolver</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}