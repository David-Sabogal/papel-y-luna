import { useState, useEffect } from 'react';
import client from '../../api/client';

const empty = { nombreProducto: '', observacion: '' };
const estadoBadge = { pendiente: 'badge-yellow', resuelto: 'badge-green', descartado: 'badge-gray' };

export default function Faltantes() {
  const [faltantes, setFaltantes]   = useState([]);
  const [form, setForm]             = useState(empty);
  const [showForm, setShowForm]     = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('pendiente');
  const [loading, setLoading]       = useState(false);
  const [msg, setMsg]               = useState(null);

  useEffect(() => { cargar(); }, [filtroEstado]);

  const cargar = async () => {
    const params = new URLSearchParams();
    if (filtroEstado) params.append('estado', filtroEstado);
    const { data } = await client.get(`/api/faltantes?${params}`);
    setFaltantes(data);
  };

  const mostrarMsg = (texto, tipo = 'success') => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg(null), 3000);
  };

  const guardar = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await client.post('/api/faltantes', {
        nombreProducto: form.nombreProducto,
        observacion:    form.observacion || null,
        tipo:           'no_registrado', // valor por defecto para compatibilidad
        estado:         'pendiente',
      });
      setShowForm(false); setForm(empty);
      mostrarMsg('Tarea registrada');
      cargar();
    } catch (err) { mostrarMsg('Error al registrar', 'error'); }
    finally { setLoading(false); }
  };

  const cambiarEstado = async (id, estado) => {
    await client.patch(`/api/faltantes/${id}/estado`, { estado });
    mostrarMsg(estado === 'resuelto' ? '✅ Tarea resuelta' : 'Tarea descartada');
    cargar();
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📝 Tareas pendientes</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nueva tarea</button>
      </div>

      {msg && (
        <div className={`productos-msg ${msg.tipo === 'error' ? 'msg-error' : 'msg-success'}`}
          style={{ marginBottom: 14 }}>
          {msg.texto}
        </div>
      )}

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['', 'pendiente', 'resuelto', 'descartado'].map(e => (
          <button key={e}
            className={`btn ${filtroEstado === e ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFiltroEstado(e)}>
            {e === '' ? 'Todas' : e.charAt(0).toUpperCase() + e.slice(1)}
          </button>
        ))}
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tarea</th>
              <th>Descripción / Notas</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {faltantes.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#bbb' }}>
                No hay tareas
              </td></tr>
            ) : faltantes.map(f => (
              <tr key={f.id}>
                <td><strong>{f.nombreProducto}</strong></td>
                <td style={{ color: '#888', fontSize: '.86rem', maxWidth: 220,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.observacion || '—'}
                </td>
                <td><span className={`badge ${estadoBadge[f.estado]}`}>{f.estado}</span></td>
                <td style={{ whiteSpace: 'nowrap', color: '#888', fontSize: '.84rem' }}>
                  {new Date(f.createdAt).toLocaleDateString('en-US')}
                </td>
                <td>
                  {f.estado === 'pendiente' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-success"
                        style={{ padding: '4px 8px', fontSize: '.76rem' }}
                        onClick={() => cambiarEstado(f.id, 'resuelto')}>
                        ✓ Resolver
                      </button>
                      <button className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '.76rem' }}
                        onClick={() => cambiarEstado(f.id, 'descartado')}>
                        Descartar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>📝 Nueva tarea</h3>
            <form onSubmit={guardar}
              style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label>Tarea *</label>
                <input required value={form.nombreProducto} autoFocus
                  placeholder="Ej: Comprar lubricante, Reparar chasis BMW..."
                  onChange={e => setForm({ ...form, nombreProducto: e.target.value })} />
              </div>
              <div className="field">
                <label>Notas (opcional)</label>
                <textarea rows={3} value={form.observacion}
                  placeholder="Detalles adicionales..."
                  onChange={e => setForm({ ...form, observacion: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-secondary"
                  onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Guardando...' : 'Registrar tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}