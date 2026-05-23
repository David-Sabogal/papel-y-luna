import { useState, useEffect } from 'react';
import client from '../../api/client';

const formatCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

const empty = { nombre: '', documento: '', telefono: '', email: '' };

export default function Clientes() {
  const [clientes, setClientes]   = useState([]);
  const [busqueda, setBusqueda]   = useState('');
  const [form, setForm]           = useState(empty);
  const [editId, setEditId]       = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const { data } = await client.get('/api/clientes');
      setClientes(data);
    } catch (err) { console.error(err); }
  };

  const mostrarMsg = (texto, tipo = 'success') => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg(null), 4000);
  };

  const filtrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.documento?.includes(busqueda) ||
    c.telefono?.includes(busqueda)
  );

  const abrirNuevo = () => { setForm(empty); setEditId(null); setShowForm(true); };

  const abrirEditar = (c) => {
    setForm({ nombre: c.nombre, documento: c.documento || '', telefono: c.telefono || '', email: c.email || '' });
    setEditId(c.id);
    setShowForm(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editId) { await client.put(`/api/clientes/${editId}`, form); }
      else { await client.post('/api/clientes', form); }
      setShowForm(false);
      mostrarMsg(editId ? 'Cliente actualizado' : 'Cliente creado correctamente');
      cargar();
    } catch (err) {
      mostrarMsg(err.response?.data?.error || 'Error al guardar', 'error');
    } finally { setLoading(false); }
  };

  const confirmarEliminar = async () => {
    try {
      await client.delete(`/api/clientes/${pendingDelete.id}`);
      setPendingDelete(null);
      mostrarMsg('Cliente eliminado');
      cargar();
    } catch (err) {
      setPendingDelete(null);
      mostrarMsg(err.response?.data?.error || 'No se pudo eliminar el cliente', 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">👥 Clientes</h1>
        <button className="btn btn-primary" onClick={abrirNuevo}>+ Nuevo cliente</button>
      </div>

      {msg && (
        <div className={`productos-msg ${msg.tipo === 'error' ? 'msg-error' : 'msg-success'}`}
          style={{ marginBottom: 14 }}>
          {msg.texto}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <input placeholder="Buscar por nombre, documento o teléfono..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Documento</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Saldo debe</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#bbb' }}>No hay clientes</td></tr>
            ) : filtrados.map(c => (
              <tr key={c.id}>
                <td><strong>{c.nombre}</strong></td>
                <td>{c.documento || '—'}</td>
                <td>{c.telefono || '—'}</td>
                <td>{c.email || '—'}</td>
                <td>
                  {c.saldoDebe > 0
                    ? <span className="badge badge-red">{formatCOP(c.saldoDebe)}</span>
                    : <span className="badge badge-green">Al día</span>}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '.78rem' }}
                      onClick={() => abrirEditar(c)}>Editar</button>
                    <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '.78rem' }}
                      onClick={() => setPendingDelete(c)}>Eliminar</button>
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
            <h3>¿Eliminar cliente?</h3>
            {pendingDelete.saldoDebe > 0 ? (
              <>
                <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 10,
                  padding: '12px 16px', margin: '14px 0', color: '#e03a3a' }}>
                  <strong>⚠️ No se puede eliminar</strong>
                  <p style={{ marginTop: 6, fontSize: '.88rem' }}>
                    {pendingDelete.nombre} tiene un saldo pendiente de{' '}
                    <strong>{formatCOP(pendingDelete.saldoDebe)}</strong>.
                    Salda la deuda antes de eliminar el cliente.
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => setPendingDelete(null)}>Cerrar</button>
                </div>
              </>
            ) : (
              <>
                <p style={{ color: '#888', fontSize: '.9rem', margin: '10px 0 20px' }}>
                  Se eliminará a <strong>{pendingDelete.nombre}</strong>. Esta acción no se puede deshacer.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => setPendingDelete(null)}>Cancelar</button>
                  <button className="btn btn-danger" onClick={confirmarEliminar}>Sí, eliminar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>{editId ? 'Editar cliente' : 'Nuevo cliente'}</h3>
            <form onSubmit={guardar} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field"><label>Nombre *</label>
                <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="field"><label>Documento</label>
                <input value={form.documento} onChange={e => setForm({ ...form, documento: e.target.value })} />
              </div>
              <div className="field"><label>Teléfono</label>
                <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
              </div>
              <div className="field"><label>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
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