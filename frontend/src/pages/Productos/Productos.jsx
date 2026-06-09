import { useState, useEffect } from 'react';
import client from '../../api/client';
import './Productos.css';
import ImageUploader from '../../components/ImageUploader';
import { useAuth } from '../../context/AuthContext';

const formatCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

const empty = {
  nombre: '', descripcion: '', precio: '', costo: '',
  categoriaId: '', stock: '', codigoInterno: '',
  vim: '', badge: '', imagen: '',
};

export default function Productos() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';

  const [productos, setProductos]   = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda]     = useState('');
  const [filtroStock, setFiltroStock] = useState(''); 
  const [form, setForm]             = useState(empty);
  const [editId, setEditId]         = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [msg, setMsg]               = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  // Estado para ver la descripción del producto en un modal
  const [showDescripcion, setShowDescripcion] = useState(null);

  // Estados para el manejo de gastos por producto
  const [showGastosProducto, setShowGastosProducto] = useState(null); 
  const [gastosProducto, setGastosProducto]         = useState([]);
  const [loadingGastos, setLoadingGastos]           = useState(false);
  const [showFormGasto, setShowFormGasto]           = useState(false);
  const [formGasto, setFormGasto] = useState({
    descripcion: '', 
    categoria: 'otro', 
    monto: '', 
    fecha: new Date().toISOString().split('T')[0],
  });

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        client.get('/api/productos'),
        client.get('/api/categorias'),
      ]);
      setProductos(pRes.data);
      setCategorias(cRes.data);
    } catch (err) { console.error(err); }
  };

  const mostrarMsg = (texto, tipo = 'success') => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg(null), 3500);
  };

  // Filtrado combinado de búsqueda de texto + botones de stock
  const filtrados = productos.filter(p => {
    const matchBusqueda = p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigoInterno?.toLowerCase().includes(busqueda.toLowerCase());
    
    const matchStock = filtroStock === '' ? true
      : filtroStock === 'con' ? p.stock > 0
      : p.stock <= 0;

    return matchBusqueda && matchStock;
  });

  const abrirNuevo = () => {
    setForm(empty);
    setEditId(null);
    setShowForm(true);
    setMsg(null);
  };

  const abrirEditar = (p) => {
    setForm({
      nombre:        p.nombre || '',
      descripcion:   p.descripcion || '',
      precio:        p.precio || '',
      costo:         p.costo || '',
      categoriaId:   p.categoriaId || '',
      stock:         p.stock ?? '',
      codigoInterno: p.codigoInterno || '',
      vim:           p.codigoBarras || '',
      badge:         p.badge || '',
      imagen:        p.imagen || '',
    });
    setEditId(p.id);
    setShowForm(true);
    setMsg(null);
  };

  // Funciones para la gestión de gastos vinculados al producto
  const abrirGastos = async (producto) => {
    setShowGastosProducto(producto);
    setLoadingGastos(true);
    try {
      const { data } = await client.get(`/api/finanzas/productos/${producto.id}/gastos`);
      setGastosProducto(data);
    } catch (err) { console.error(err); }
    finally { setLoadingGastos(false); }
  };

  const guardarGastoProducto = async (e) => {
    e.preventDefault();
    try {
      const payloadGasto = {
        ...formGasto,
        monto: Number(formGasto.monto) || 0
      };

      const { data } = await client.post(
        `/api/finanzas/productos/${showGastosProducto.id}/gastos`, payloadGasto
      );
      setGastosProducto(prev => [data, ...prev]);
      setShowFormGasto(false);
      setFormGasto({ descripcion: '', categoria: 'otro', monto: '', fecha: new Date().toISOString().split('T')[0] });
      mostrarMsg('Gasto registrado al producto');
    } catch (err) { mostrarMsg('Error al guardar gasto', 'error'); }
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return mostrarMsg('El nombre es requerido', 'error');
    if (!form.precio || isNaN(parseFloat(form.precio))) return mostrarMsg('El precio es requerido', 'error');

    setLoading(true);
    try {
      const payload = {
        nombre:        form.nombre.trim(),
        descripcion:   form.descripcion || null,
        precio:        parseFloat(form.precio),
        costo:         parseFloat(form.costo) || 0,
        categoriaId:   form.categoriaId || null,
        stock:         parseFloat(form.stock) || 0,
        codigoInterno: form.codigoInterno || null,
        codigoBarras:  form.vim || null,
        badge:         form.badge || null,
        imagen:        form.imagen || null,
      };

      if (editId) {
        await client.put(`/api/productos/${editId}`, payload);
        mostrarMsg('Producto actualizado correctamente');
      } else {
        await client.post('/api/productos', payload);
        mostrarMsg('Producto creado correctamente');
      }
      setShowForm(false);
      cargar();
    } catch (err) {
      mostrarMsg(err.response?.data?.error || 'Error al guardar el producto', 'error');
    } finally {
      setLoading(false);
    }
  };

  const confirmarEliminar = async () => {
    try {
      await client.delete(`/api/productos/${pendingDelete.id}`);
      mostrarMsg('Producto eliminado');
      setPendingDelete(null);
      cargar();
    } catch (err) {
      mostrarMsg(err.response?.data?.error || 'Error al eliminar', 'error');
      setPendingDelete(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📦 Productos</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={abrirNuevo}>+ Nuevo producto</button>
        )}
      </div>

      {msg && (
        <div className={`productos-msg ${msg.tipo === 'error' ? 'msg-error' : 'msg-success'}`}
          style={{ marginBottom: 14 }}>
          {msg.texto}
        </div>
      )}

      {/* Caja de búsqueda y controles de filtro */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Buscar por nombre o código..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <button
          className={`btn ${filtroStock === '' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 14px', fontSize: '.88rem' }}
          onClick={() => setFiltroStock('')}>
          Todos
        </button>
        <button
          className={`btn ${filtroStock === 'con' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 14px', fontSize: '.88rem' }}
          onClick={() => setFiltroStock('con')}>
          ✅ Con stock
        </button>
        <button
          className={`btn ${filtroStock === 'sin' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 14px', fontSize: '.88rem' }}
          onClick={() => setFiltroStock('sin')}>
          🔴 Agotados
        </button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precio venta</th>
              {isAdmin && <th>Costo</th>}
              <th>Stock</th>
              <th>Código</th>
              {isAdmin && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 5} style={{ textAlign: 'center', padding: 24, color: '#bbb' }}>
                  No hay productos que coincidan con los filtros
                </td>
              </tr>
            ) : filtrados.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {p.imagen && (
                      <img src={p.imagen} alt={p.nombre}
                        style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }}
                        onError={e => e.target.style.display = 'none'} />
                    )}
                    <div>
                      <strong>{p.nombre}</strong>
                      {p.badge && (
                        <span className="badge badge-blue" style={{ marginLeft: 6 }}>{p.badge}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td>
                  {categorias.find(c => c.id === p.categoriaId)?.nombre ||
                    <span style={{ color: '#bbb' }}>—</span>}
                </td>
                <td>{formatCOP(p.precio)}</td>
                {isAdmin && <td>{formatCOP(p.costo)}</td>}
                <td>
                  <span className={`badge ${p.stock < 5 ? 'badge-red' : 'badge-green'}`}>
                    {p.stock}
                  </span>
                </td>
                <td>{p.codigoInterno || <span style={{ color: '#bbb' }}>—</span>}</td>
                {isAdmin && (
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '.78rem' }}
                        onClick={() => abrirEditar(p)}>
                        Editar
                      </button>
                      
                      {p.descripcion && (
                        <button className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '.78rem' }}
                          onClick={() => setShowDescripcion(p)}>
                          📄 Detalles
                        </button>
                      )}

                      <button className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '.78rem', color: '#1565c0', borderColor: '#1565c0' }}
                        onClick={() => abrirGastos(p)}>
                        💸 Gastos
                      </button>
                      <button className="btn btn-danger"
                        style={{ padding: '4px 10px', fontSize: '.78rem' }}
                        onClick={() => setPendingDelete({ id: p.id, nombre: p.nombre })}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal confirmar eliminar */}
      {pendingDelete && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>¿Eliminar producto?</h3>
            <p style={{ color: '#888', fontSize: '.9rem', margin: '10px 0 20px' }}>
              Se eliminará <strong>{pendingDelete.nombre}</strong>. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setPendingDelete(null)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={confirmarEliminar}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal formulario — solo ADMIN */}
      {showForm && isAdmin && (
        <div className="modal-overlay">
          <div className="modal-box modal-wide">
            <h3>{editId ? 'Editar producto' : 'Nuevo producto'}</h3>

            {msg && (
              <div className={`productos-msg ${msg.tipo === 'error' ? 'msg-error' : 'msg-success'}`}
                style={{ marginTop: 10, marginBottom: 0 }}>
                {msg.texto}
              </div>
            )}

            <form onSubmit={guardar} className="producto-form">
              <div className="form-grid">

                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Imagen del producto</label>
                  <ImageUploader
                    value={form.imagen}
                    onChange={(val) => setForm({ ...form, imagen: val })}
                  />
                </div>

                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Nombre *</label>
                  <input
                    required
                    placeholder="Ej: Ferrari"
                    value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label>Precio de venta *</label>
                  <input required type="number" min="0" placeholder="0"
                    value={form.precio}
                    onChange={e => setForm({ ...form, precio: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label>Costo (precio de compra)</label>
                  <input type="number" min="0" placeholder="0"
                    value={form.costo}
                    onChange={e => setForm({ ...form, costo: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label>Stock actual</label>
                  <input type="number" min="0" placeholder="0"
                    value={form.stock}
                    onChange={e => setForm({ ...form, stock: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label>Categoría</label>
                  <select value={form.categoriaId}
                    onChange={e => setForm({ ...form, categoriaId: e.target.value })}>
                    <option value="">— Sin categoría —</option>
                    {categorias.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Código interno</label>
                  <input placeholder="Ej: CUA-001"
                    value={form.codigoInterno}
                    onChange={e => setForm({ ...form, codigoInterno: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label>VIM</label>
                  <input placeholder="Opcional"
                    value={form.vim}
                    onChange={e => setForm({ ...form, vim: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label>Badge / etiqueta</label>
                  <input placeholder="Ej: Nuevo, Popular"
                    value={form.badge}
                    onChange={e => setForm({ ...form, badge: e.target.value })}
                  />
                </div>

              </div>

              <div className="field" style={{ marginTop: 8 }}>
                <label>Descripción</label>
                <textarea rows={2} placeholder="Descripción opcional del producto"
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary"
                  onClick={() => { setShowForm(false); setMsg(null); }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Guardando...' : (editId ? 'Guardar cambios' : 'Crear producto')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de visualización y registro de gastos por producto */}
      {showGastosProducto && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 620, maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3>💸 Gastos — {showGastosProducto.nombre}</h3>
              <button className="btn btn-secondary" style={{ padding: '4px 12px' }}
                onClick={() => { setShowGastosProducto(null); setShowFormGasto(false); }}>✕</button>
            </div>
            
            {!showFormGasto && (
              <button className="btn btn-primary" style={{ marginBottom: 14 }}
                onClick={() => setShowFormGasto(true)}>+ Agregar gasto</button>
            )}

            {showFormGasto && (
              <form onSubmit={guardarGastoProducto}
                style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 10,
                  padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="field"><label>Descripción *</label>
                  <input required value={formGasto.descripcion} autoFocus
                    onChange={e => setFormGasto({ ...formGasto, descripcion: e.target.value })}
                    placeholder="Ej: Mantenimiento o empaque" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div className="field"><label>Categoría</label>
                    <select value={formGasto.categoria}
                      onChange={e => setFormGasto({ ...formGasto, categoria: e.target.value })}>
                      {['servicios','gasolina','mantenimiento','pintura','reparacion','otro'].map(c =>
                        <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Monto *</label>
                    <input required type="number" min="0" value={formGasto.monto}
                      onChange={e => setFormGasto({ ...formGasto, monto: e.target.value })} />
                  </div>
                  <div className="field"><label>Fecha *</label>
                    <input required type="date" value={formGasto.fecha}
                      onChange={e => setFormGasto({ ...formGasto, fecha: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary"
                    onClick={() => setShowFormGasto(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Guardar gasto</button>
                </div>
              </form>
            )}

            {loadingGastos ? (
              <p style={{ color: '#888', textAlign: 'center', padding: 20 }}>Cargando...</p>
            ) : gastosProducto.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#bbb' }}>
                <p style={{ fontSize: '2rem' }}>🔧</p>
                <p>Sin gastos registrados para este producto</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '.76rem' }}>Fecha</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '.76rem' }}>Descripción</th>
                    <th style={{ padding: '8px', fontSize: '.76rem' }}>Categoría</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontSize: '.76rem' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {gastosProducto.map(g => (
                    <tr key={g.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '8px', fontSize: '.84rem', whiteSpace: 'nowrap' }}>{g.fecha}</td>
                      <td style={{ padding: '8px', fontSize: '.84rem' }}>{g.descripcion}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <span className="badge badge-yellow">{g.categoria}</span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#e03a3a' }}>
                        {formatCOP(g.monto)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#fff8f8' }}>
                    <td colSpan={3} style={{ padding: '10px 8px', fontWeight: 700, fontSize: '.86rem' }}>
                      Total gastos producto
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, color: '#e03a3a' }}>
                      {formatCOP(gastosProducto.reduce((s, g) => s + Number(g.monto), 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal para ver la descripción detallada del producto */}
      {showDescripcion && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <h3>📄 {showDescripcion.nombre}</h3>
            <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '14px 16px',
              margin: '14px 0', fontSize: '.9rem', lineHeight: 1.7, color: '#333',
              whiteSpace: 'pre-wrap' }}>
              {showDescripcion.descripcion}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowDescripcion(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}