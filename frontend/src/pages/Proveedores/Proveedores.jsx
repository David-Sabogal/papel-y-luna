import { useState, useEffect } from 'react';
import client from '../../api/client';

const empty = { nombre: '', nit: '', telefono: '', email: '', direccion: '' };

export default function Proveedores() {
  const [proveedores, setProveedores]   = useState([]);
  const [form, setForm]                 = useState(empty);
  const [editId, setEditId]             = useState(null);
  const [showForm, setShowForm]         = useState(false);
  const [loading, setLoading]           = useState(false);
  const [msg, setMsg]                   = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    const { data } = await client.get('/api/proveedores');
    setProveedores(data);
  };

  const mostrarMsg = (texto, tipo = 'success') => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg(null), 3500);
  };

  const guardar = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (editId) await client.put(`/api/proveedores/${editId}`, form);
      else await client.post('/api/proveedores', form);
      setShowForm(false); setForm(empty); setEditId(null);
      mostrarMsg(editId ? 'Proveedor actualizado' : 'Proveedor creado');
      cargar();
    } catch (err) {
      mostrarMsg(err.response?.data?.error || 'Error al guardar', 'error');
    } finally { setLoading(false); }
  };

  const confirmarEliminar = async () => {
    try {
      await client.delete(`/api/proveedores/${pendingDelete.id}`);
      setPendingDelete(null);
      mostrarMsg('Proveedor eliminado');
      cargar();
    } catch (err) {
      setPendingDelete(null);
      mostrarMsg(err.response?.data?.error || 'Error al eliminar', 'error');
    }
  };

  const abrir = (p) => {
    if (p) {
      setForm({ nombre: p.nombre, nit: p.nit || '', telefono: p.telefono || '',
        email: p.email || '', direccion: p.direccion || '' });
      setEditId(p.id);
    } else { setForm(empty); setEditId(null); }
    setShowForm(true);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🤝 Proveedores</h1>
        <button className="btn btn-primary" onClick={() => abrir(null)}>+ Nuevo</button>
      </div>

      {msg && (
        <div className={`productos-msg ${msg.tipo === 'error' ? 'msg-error' : 'msg-success'}`}
          style={{ marginBottom: 14 }}>
          {msg.texto}
        </div>
      )}

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>NIT</th><th>Teléfono</th><th>Email</th><th>Acciones</th></tr></thead>
          <tbody>
            {proveedores.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#bbb' }}>No hay proveedores</td></tr>
            ) : proveedores.map(p => (
              <tr key={p.id}>
                <td><strong>{p.nombre}</strong></td>
                <td>{p.nit || '—'}</td>
                <td>{p.telefono || '—'}</td>
                <td>{p.email || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '.78rem' }}
                      onClick={() => abrir(p)}>Editar</button>
                    <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '.78rem' }}
                      onClick={() => setPendingDelete({ id: p.id, nombre: p.nombre })}>Eliminar</button>
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
            <h3>¿Eliminar proveedor?</h3>
            <p style={{ color: '#888', fontSize: '.9rem', margin: '10px 0 20px' }}>
              Se eliminará <strong>{pendingDelete.nombre}</strong>. Esta acción no se puede deshacer.
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
            <h3>{editId ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
            <form onSubmit={guardar} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['nombre', 'Nombre *', true],
                ['nit', 'NIT', false],
                ['telefono', 'Teléfono', false],
                ['email', 'Email', false],
                ['direccion', 'Dirección', false],
              ].map(([key, label, req]) => (
                <div className="field" key={key}><label>{label}</label>
                  <input required={req} value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })} />
                </div>
              ))}
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