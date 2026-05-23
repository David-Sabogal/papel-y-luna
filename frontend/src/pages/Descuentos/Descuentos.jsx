import { useState, useEffect } from 'react';
import client from '../../api/client';

const empty = { nombre: '', tipo: 'porcentaje', valor: '', activo: true };

export default function Descuentos() {
  const [descuentos, setDescuentos]     = useState([]);
  const [form, setForm]                 = useState(empty);
  const [editId, setEditId]             = useState(null);
  const [showForm, setShowForm]         = useState(false);
  const [loading, setLoading]           = useState(false);
  const [msg, setMsg]                   = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    const { data } = await client.get('/api/descuentos');
    setDescuentos(data);
  };

  const mostrarMsg = (texto, tipo = 'success') => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg(null), 3500);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, valor: parseFloat(form.valor) };
      if (editId) await client.put(`/api/descuentos/${editId}`, payload);
      else await client.post('/api/descuentos', payload);
      setShowForm(false); setForm(empty); setEditId(null);
      mostrarMsg(editId ? 'Descuento actualizado' : 'Descuento creado');
      cargar();
    } catch (err) {
      mostrarMsg(err.response?.data?.error || 'Error al guardar', 'error');
    } finally { setLoading(false); }
  };

  const confirmarEliminar = async () => {
    try {
      await client.delete(`/api/descuentos/${pendingDelete.id}`);
      setPendingDelete(null);
      mostrarMsg('Descuento eliminado');
      cargar();
    } catch (err) {
      setPendingDelete(null);
      mostrarMsg(err.response?.data?.error || 'Error al eliminar', 'error');
    }
  };

  const abrir = (d) => {
    if (d) { setForm({ nombre: d.nombre, tipo: d.tipo, valor: d.valor, activo: d.activo }); setEditId(d.id); }
    else { setForm(empty); setEditId(null); }
    setShowForm(true);
  };

  const toggleActivo = async (d) => {
    await client.put(`/api/descuentos/${d.id}`, { ...d, activo: !d.activo });
    cargar();
  };

  const formatCOP = (v) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🏷️ Descuentos</h1>
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
          <thead><tr><th>Nombre</th><th>Tipo</th><th>Valor</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {descuentos.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#bbb' }}>No hay descuentos</td></tr>
            ) : descuentos.map(d => (
              <tr key={d.id}>
                <td><strong>{d.nombre}</strong></td>
                <td>{d.tipo === 'porcentaje' ? 'Porcentaje' : 'Valor fijo'}</td>
                <td>{d.tipo === 'porcentaje' ? `${d.valor}%` : formatCOP(d.valor)}</td>
                <td>
                  <button onClick={() => toggleActivo(d)}
                    className={`badge ${d.activo ? 'badge-green' : 'badge-gray'}`}
                    style={{ border: 'none', cursor: 'pointer' }}>
                    {d.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '.78rem' }}
                      onClick={() => abrir(d)}>Editar</button>
                    <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '.78rem' }}
                      onClick={() => setPendingDelete({ id: d.id, nombre: d.nombre })}>Eliminar</button>
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
            <h3>¿Eliminar descuento?</h3>
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
            <h3>{editId ? 'Editar descuento' : 'Nuevo descuento'}</h3>
            <form onSubmit={guardar} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field"><label>Nombre *</label>
                <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="field"><label>Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  <option value="porcentaje">Porcentaje (%)</option>
                  <option value="fijo">Valor fijo ($)</option>
                </select>
              </div>
              <div className="field"><label>Valor *</label>
                <input required type="number" min="0" value={form.valor}
                  onChange={e => setForm({ ...form, valor: e.target.value })} />
              </div>
              <label className="check-label">
                <input type="checkbox" checked={form.activo}
                  onChange={e => setForm({ ...form, activo: e.target.checked })} />
                Activo
              </label>
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