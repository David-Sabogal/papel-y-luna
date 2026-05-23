import { useState } from 'react';
import client from '../../api/client';

const formatCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

export default function Reportes() {
  const [desde, setDesde]     = useState('');
  const [hasta, setHasta]     = useState('');
  const [data, setData]       = useState(null);
  const [compras, setCompras] = useState(null);
  const [faltantes, setFaltantes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState('ventas');

  const today = new Date().toISOString().split('T')[0];
  const hoy   = () => { setDesde(today); setHasta(today); };

  const cargar = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (desde) params.append('desde', desde);
      if (hasta) params.append('hasta', hasta);

      // Faltantes: mismo rango de fechas
      const faltantesParams = new URLSearchParams();
      if (desde) faltantesParams.append('desde', desde);
      if (hasta) faltantesParams.append('hasta', hasta);

      const [vRes, cRes, fRes] = await Promise.all([
        client.get(`/api/ventas/reporte?${params}`),
        client.get(`/api/compras?${params}`),
        client.get(`/api/faltantes/reporte?${faltantesParams}`),
      ]);
      setData(vRes.data);
      setCompras(cRes.data);
      setFaltantes(fRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📊 Reportes</h1>
      </div>

      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: 'none' }}>
          <label>Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ width: 'auto' }} />
        </div>
        <div className="field" style={{ flex: 'none' }}>
          <label>Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ width: 'auto' }} />
        </div>
        <button className="btn btn-secondary" onClick={hoy}>Hoy</button>
        <button className="btn btn-primary" onClick={cargar} disabled={loading}>
          {loading ? 'Cargando...' : '🔍 Generar reporte'}
        </button>
      </div>

      {!data && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: '#bbb' }}>
          <p style={{ fontSize: '2rem', marginBottom: 12 }}>📊</p>
          <p>Selecciona un rango de fechas y genera el reporte</p>
        </div>
      )}

      {data && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { key: 'ventas',    label: '💰 Ventas' },
              { key: 'productos', label: '🏆 Más vendidos' },
              { key: 'compras',   label: '🚚 Compras' },
              { key: 'faltantes', label: '⚠️ Faltantes' },
            ].map(t => (
              <button key={t.key}
                className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'ventas' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
                {[
                  { label: 'Total ventas cerradas', value: data.totalVentas,   isMoney: false },
                  { label: 'Ingresos totales',      value: data.totalGeneral,  isMoney: true  },
                  { label: 'Ticket promedio',        value: data.totalVentas > 0 ? data.totalGeneral / data.totalVentas : 0, isMoney: true },
                ].map(item => (
                  <div key={item.label} className="card" style={{ textAlign: 'center' }}>
                    <p style={{ color: '#888', fontSize: '.76rem', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1a2e' }}>
                      {item.isMoney ? formatCOP(item.value) : item.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="card table-wrap">
                <h3 style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', fontSize: '.95rem', fontWeight: 700 }}>
                  Detalle de ventas
                </h3>
                <table>
                  <thead>
                    <tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Total</th><th>Pago</th></tr>
                  </thead>
                  <tbody>
                    {data.ventas.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: '#bbb' }}>Sin ventas en este rango</td></tr>
                    ) : data.ventas.map(v => (
                      <tr key={v.id}>
                        <td>#{v.id}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{new Date(v.createdAt).toLocaleDateString('es-CO')}</td>
                        <td>{v.Cliente?.nombre || '—'}</td>
                        <td><strong>{formatCOP(v.total)}</strong></td>
                        <td>{v.metodoPago}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'productos' && (
            <div className="card table-wrap">
              <h3 style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', fontSize: '.95rem', fontWeight: 700 }}>
                🏆 Productos más vendidos
              </h3>
              <table>
                <thead>
                  <tr><th>#</th><th>Producto</th><th>Unidades</th><th>Total generado</th></tr>
                </thead>
                <tbody>
                  {data.productosMasVendidos.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: '#bbb' }}>Sin datos</td></tr>
                  ) : data.productosMasVendidos.map((p, i) => (
                    <tr key={p.productoId}>
                      <td><strong>{i + 1}</strong></td>
                      <td>{p.nombre}</td>
                      <td><span className="badge badge-blue">{p.cantidad}</span></td>
                      <td><strong>{formatCOP(p.total)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'compras' && (
            <div className="card table-wrap">
              <h3 style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', fontSize: '.95rem', fontWeight: 700 }}>
                🚚 Compras registradas
              </h3>
              <table>
                <thead>
                  <tr><th>#</th><th>Fecha</th><th>Proveedor</th><th>Total</th><th>Método</th></tr>
                </thead>
                <tbody>
                  {!compras || compras.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: '#bbb' }}>Sin compras en este rango</td></tr>
                  ) : compras.map(c => (
                    <tr key={c.id}>
                      <td>#{c.id}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(c.createdAt).toLocaleDateString('es-CO')}</td>
                      <td>{c.Proveedor?.nombre || '—'}</td>
                      <td><strong>{formatCOP(c.total)}</strong></td>
                      <td>{c.metodoPago}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'faltantes' && (
            <div className="card table-wrap">
              <h3 style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', fontSize: '.95rem', fontWeight: 700 }}>
                ⚠️ Faltantes frecuentes
              </h3>
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Producto</th><th>Veces</th>
                    <th>Cant. total</th><th>Última solicitud</th><th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {!faltantes || faltantes.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#bbb' }}>Sin faltantes en este rango</td></tr>
                  ) : faltantes.map((f, i) => (
                    <tr key={i}>
                      <td><strong>{i + 1}</strong></td>
                      <td>{f.nombreProducto}</td>
                      <td><span className="badge badge-blue">{f.veces}</span></td>
                      <td>{f.cantidadTotal > 0 ? f.cantidadTotal : '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(f.ultimaFecha).toLocaleDateString('es-CO')}</td>
                      <td>
                        <span className={`badge ${{ pendiente: 'badge-yellow', resuelto: 'badge-green', descartado: 'badge-gray' }[f.estado] || 'badge-gray'}`}>
                          {f.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}