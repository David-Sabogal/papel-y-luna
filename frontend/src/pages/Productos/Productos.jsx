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
  const [filtroStock, setFiltroStock] = useState(''); // ← Estado del filtro de stock agregado
  const [form, setForm]             = useState(empty);
  const [editId, setEditId]         = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [msg, setMsg]               = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

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

      {/* Caja de búsqueda y controles de filtro con flexbox */}
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
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '.78rem' }}
                        onClick={() => abrirEditar(p)}>
                        Editar
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
                    placeholder="Ej: Cuaderno universitario 100 hojas"
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
    </div>
  );
}