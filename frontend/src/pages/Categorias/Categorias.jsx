import { useState, useEffect } from 'react';
import client from '../../api/client';

const empty = { nombre: '', color: '#e28a85', icono: '' };

export default function Categorias() {
  const [categorias, setCategorias]     = useState([]);
  const [form, setForm]                 = useState(empty);
  const [editId, setEditId]             = useState(null);
  const [showForm, setShowForm]         = useState(false);
  const [loading, setLoading]           = useState(false);
  const [msg, setMsg]                   = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    const { data } = await client.get('/api/categorias');
    setCategorias(data);
  };

  const mostrarMsg = (texto, tipo = 'success') => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg(null), 3500);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editId) await client.put(`/api/categorias/${editId}`, form);
      else await client.post('/api/categorias', form);
      setShowForm(false); setForm(empty); setEditId(null);
      mostrarMsg(editId ? 'Categoría actualizada' : 'Categoría creada');
      cargar();
    } catch (err) {
      mostrarMsg(err.response?.data?.error || 'Error al guardar', 'error');
    } finally { setLoading(false); }
  };

  const confirmarEliminar = async () => {
    try {
      await client.delete(`/api/categorias/${pendingDelete.id}`);
      setPendingDelete(null);
      mostrarMsg('Categoría eliminada');
      cargar();
    } catch (err) {
      setPendingDelete(null);
      mostrarMsg(err.response?.data?.error || 'Error al eliminar', 'error');
    }
  };

  const abrir = (c) => {
    if (c) { setForm({ nombre: c.nombre, color: c.color || '#e28a85', icono: c.icono || '' }); setEditId(c.id); }
    else { setForm(empty); setEditId(null); }
    setShowForm(true);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🗂️ Categorías</h1>
        <button className="btn btn-primary" onClick={() => abrir(null)}>+ Nueva</button>
      </div>

      {msg && (
        <div className={`productos-msg ${msg.tipo === 'error' ? 'msg-error' : 'msg-success'}`}
          style={{ marginBottom: 14 }}>
          {msg.texto}
        </div>
      )}

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Color</th><th>Ícono</th><th>Acciones</th></tr></thead>
          <tbody>
            {categorias.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: '#bbb' }}>No hay categorías</td></tr>
            ) : categorias.map(c => (
              <tr key={c.id}>
                <td><strong>{c.nombre}</strong></td>
                <td>
                  <span style={{ display: 'inline-block', width: 20, height: 20, borderRadius: 4,
                    background: c.color || '#ccc', verticalAlign: 'middle', marginRight: 8 }} />
                  {c.color}
                </td>
                <td>{c.icono || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '.78rem' }}
                      onClick={() => abrir(c)}>Editar</button>
                    <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '.78rem' }}
                      onClick={() => setPendingDelete({ id: c.id, nombre: c.nombre })}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal confirmar eliminar */}
      {pendingDelete && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>¿Eliminar categoría?</h3>
            <p style={{ color: '#888', fontSize: '.9rem', margin: '10px 0 20px' }}>
              Se eliminará <strong>{pendingDelete.nombre}</strong>. Los productos que la tenían asignada
              quedarán sin categoría.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setPendingDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={confirmarEliminar}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>{editId ? 'Editar categoría' : 'Nueva categoría'}</h3>
            <form onSubmit={guardar} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field"><label>Nombre *</label>
                <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="field"><label>Ícono (emoji)</label>
                <input placeholder="Ej: 📚" value={form.icono} onChange={e => setForm({ ...form, icono: e.target.value })} />
              </div>
              <div className="field"><label>Color</label>
                <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
                  style={{ height: 40, padding: 2, cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}