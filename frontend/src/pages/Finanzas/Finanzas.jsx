import { useState, useEffect } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import client from '../../api/client';
import './Finanzas.css';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
);

const formatCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

const CATEGORIAS = ['servicios', 'gasolina', 'mantenimiento', 'arriendo', 'nomina', 'publicidad', 'otro'];

const emptyGasto   = { descripcion: '', categoria: 'otro', monto: '', fecha: new Date().toISOString().split('T')[0] };
const emptyCapital = { descripcion: '', monto: '', fecha: new Date().toISOString().split('T')[0], tipo: 'aporte' };

export default function Finanzas() {
  const [dash, setDash]                   = useState(null);
  const [gastos, setGastos]               = useState([]);
  const [gastosVehiculos, setGastosVehiculos] = useState([]); // Nuevo estado para vehículos
  const [capital, setCapital]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [tab, setTab]                     = useState('dashboard');
  const [showGasto, setShowGasto]         = useState(false);
  const [showCapital, setShowCapital]     = useState(false);
  const [formGasto, setFormGasto]         = useState(emptyGasto);
  const [formCapital, setFormCapital]     = useState(emptyCapital);
  const [msg, setMsg]                     = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  // Filtros gastos administrativos
  const [filtroDesde, setFiltroDesde]   = useState('');
  const [filtroHasta, setFiltroHasta]   = useState('');
  const [filtroCat, setFiltroCat]       = useState('');

  useEffect(() => { cargar(); }, []);

  const mostrarMsg = (texto, tipo = 'success') => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg(null), 3500);
  };

  const cargar = async () => {
    setLoading(true);
    try {
      const [dRes, gRes, cRes, gvRes] = await Promise.all([
        client.get('/api/finanzas/dashboard'),
        client.get('/api/finanzas/gastos'),
        client.get('/api/finanzas/capital'),
        client.get('/api/finanzas/gastos/vehiculos'), // Nuevo endpoint integrado
      ]);
      setDash(dRes.data);
      setGastos(gRes.data);
      setCapital(cRes.data);
      setGastosVehiculos(gvRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const cargarGastosFiltrados = async () => {
    const params = new URLSearchParams();
    if (filtroDesde) params.append('desde', filtroDesde);
    if (filtroHasta) params.append('hasta', filtroHasta);
    if (filtroCat)   params.append('categoria', filtroCat);
    const { data } = await client.get(`/api/finanzas/gastos?${params}`);
    setGastos(data);
  };

  const guardarGasto = async (e) => {
    e.preventDefault();
    try {
      const payloadGasto = { ...formGasto, monto: Number(formGasto.monto) || 0 };
      await client.post('/api/finanzas/gastos', payloadGasto);
      setShowGasto(false); setFormGasto(emptyGasto);
      mostrarMsg('Gasto registrado');
      cargar();
    } catch (err) { mostrarMsg(err.response?.data?.error || 'Error', 'error'); }
  };

  const eliminarGasto = async () => {
    try {
      await client.delete(`/api/finanzas/gastos/${pendingDelete.id}`);
      setPendingDelete(null);
      mostrarMsg('Gasto eliminado');
      cargar();
    } catch (err) { mostrarMsg('Error al eliminar', 'error'); setPendingDelete(null); }
  };

  const guardarCapital = async (e) => {
    e.preventDefault();
    try {
      const payloadCapital = { ...formCapital, monto: Number(formCapital.monto) || 0 };
      await client.post('/api/finanzas/capital', payloadCapital);
      setShowCapital(false); setFormCapital(emptyCapital);
      mostrarMsg('Capital registrado');
      cargar();
    } catch (err) { mostrarMsg(err.response?.data?.error || 'Error', 'error'); }
  };

  // ── Datos para gráficos ────────────────────────────────────────
  const meses = dash?.flujoMensual?.map(m => {
    const [y, mo] = m.mes.split('-');
    return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
  }) || [];

  const curvaJ = {
    labels: meses,
    datasets: [{
      label: 'Flujo acumulado',
      data: dash?.flujoMensual?.map(m => m.acumulado) || [],
      borderColor: '#e28a85',
      backgroundColor: (ctx) => {
        const chart = ctx.chart;
        const { ctx: c, chartArea } = chart;
        if (!chartArea) return 'transparent';
        const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, 'rgba(226,138,133,0.25)');
        gradient.addColorStop(1, 'rgba(226,138,133,0.02)');
        return gradient;
      },
      fill: true,
      tension: 0.4,
      pointBackgroundColor: (ctx) => {
        const val = ctx.raw;
        return val >= 0 ? '#2e7d32' : '#e03a3a';
      },
      pointRadius: 5,
    }],
  };

  const barData = {
    labels: meses,
    datasets: [
      {
        label: 'Ingresos',
        data: dash?.flujoMensual?.map(m => m.ingresos) || [],
        backgroundColor: 'rgba(46,125,50,0.75)',
        borderRadius: 4,
      },
      {
        label: 'Egresos',
        data: dash?.flujoMensual?.map(m => m.egresos) || [],
        backgroundColor: 'rgba(224,58,58,0.75)',
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: true }, tooltip: { callbacks: {
      label: (ctx) => ` ${formatCOP(ctx.raw)}`,
    }}},
    scales: {
      y: { ticks: { callback: (v) => formatCOP(v) } },
    },
  };

  const kpis = dash?.kpis;

  return (
    <div className="finanzas-wrap">
      <div className="page-header">
        <h1 className="page-title">💰 Finanzas</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowCapital(true)}>
            💼 Inyectar capital
          </button>
          <button className="btn btn-primary" onClick={() => setShowGasto(true)}>
            + Agregar gasto
          </button>
        </div>
      </div>

      {msg && (
        <div className={`productos-msg ${msg.tipo === 'error' ? 'msg-error' : 'msg-success'}`}
          style={{ marginBottom: 14 }}>
          {msg.texto}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { key: 'dashboard',        label: '📊 Dashboard' },
          { key: 'gastos',           label: '📋 Gastos Admin' },
          { key: 'gastos_vehiculos', label: '🚗 Gastos Vehículos' }, // Tab nuevo en español
          { key: 'capital',          label: '💼 Capital' },
          { key: 'historico',        label: '📅 Histórico mensual' },
          { key: 'todo',             label: '📒 Todo' },
        ].map(t => (
          <button key={t.key}
            className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: '#888', padding: 20 }}>Cargando datos financieros...</p>}

      {/* ── Tab Dashboard ── */}
      {!loading && tab === 'dashboard' && kpis && (
        <>
          {/* Hero KPI */}
          <div className={`finanzas-hero ${kpis.valorNetoCaja >= 0 ? 'hero-positivo' : 'hero-negativo'}`}>
            <div>
              <p className="hero-label">Valor Neto de Caja</p>
              <p className={`hero-numero ${kpis.valorNetoCaja >= 0 ? 'positivo' : 'negativo'}`}>
                {formatCOP(kpis.valorNetoCaja)}
              </p>
              <p className="hero-sub">
                {kpis.valorNetoCaja >= 0 ? '✅ El negocio genera excedente' : '⚠️ Aún en recuperación de inversión'}
              </p>
            </div>
            <div className="hero-divider" />
            <div>
              <p className="hero-label">Estado de recuperación</p>
              {kpis.enPuntoEquilibrio ? (
                <p className="hero-numero positivo">🎯 Punto de equilibrio superado</p>
              ) : (
                <>
                  <p className="hero-numero negativo">{formatCOP(kpis.recuperacion)}</p>
                  <p className="hero-sub">falta para recuperar la inversión</p>
                </>
              )}
            </div>
          </div>

          {/* KPI blocks */}
          <div className="kpi-grid">
            {[
              { label: 'Total ventas',   value: kpis.totalVentas,   color: 'green' },
              { label: 'Total compras',  value: kpis.totalCompras,  color: 'red' },
              { label: 'Total gastos',   value: kpis.totalGastos,   color: 'red' },
              { label: 'Total egresos',  value: kpis.totalEgresos,  color: 'red' },
              { label: 'Capital invertido', value: kpis.totalCapital, color: 'blue' },
            ].map(k => (
              <div key={k.label} className="kpi-card">
                <p className="kpi-label">{k.label}</p>
                <p className={`kpi-valor kpi-${k.color}`}>{formatCOP(k.value)}</p>
              </div>
            ))}
          </div>

          {/* Gráficos */}
          {meses.length > 0 ? (
            <div className="graficos-grid">
              <div className="card">
                <h3 className="grafico-titulo">📈 Curva J — Flujo acumulado</h3>
                <p className="grafico-sub">El cruce por cero marca el punto de equilibrio real</p>
                <Line data={curvaJ} options={chartOptions} />
              </div>
              <div className="card">
                <h3 className="grafico-titulo">📊 Ingresos vs Egresos por mes</h3>
                <p className="grafico-sub">Comparativa mensual de operaciones</p>
                <Bar data={barData} options={chartOptions} />
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: '#bbb', marginTop: 20 }}>
              <p style={{ fontSize: '2rem' }}>📊</p>
              <p>No hay datos suficientes para mostrar gráficos aún</p>
            </div>
          )}
        </>
      )}

      {/* ── Tab Gastos Admin ── */}
      {!loading && tab === 'gastos' && (
        <>
          <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)}
              style={{ width: 'auto' }} />
            <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)}
              style={{ width: 'auto' }} />
            <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)}
              style={{ width: 'auto' }}>
              <option value="">Todas las categorías</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn btn-secondary" onClick={cargarGastosFiltrados}>Filtrar</button>
            <button className="btn btn-secondary" onClick={() => {
              setFiltroDesde(''); setFiltroHasta(''); setFiltroCat('');
              cargar();
            }}>Limpiar</button>
          </div>

          <div className="card table-wrap">
            <table>
              <thead>
                <tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Monto</th><th></th></tr>
              </thead>
              <tbody>
                {gastos.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#bbb' }}>
                    No hay gastos registrados
                  </td></tr>
                ) : gastos.map(g => (
                  <tr key={g.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{g.fecha}</td>
                    <td>{g.descripcion}</td>
                    <td><span className="badge badge-yellow">{g.categoria}</span></td>
                    <td><strong style={{ color: '#e03a3a' }}>{formatCOP(g.monto)}</strong></td>
                    <td>
                      <button className="btn btn-danger"
                        style={{ padding: '4px 8px', fontSize: '.76rem' }}
                        onClick={() => setPendingDelete({ id: g.id, desc: g.descripcion })}>
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Tab Gastos Vehículos (Nuevo bloque limpio en español) ── */}
      {!loading && tab === 'gastos_vehiculos' && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Vehículo</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {gastosVehiculos.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#bbb' }}>
                  No hay gastos de vehículos registrados
                </td></tr>
              ) : gastosVehiculos.map(g => (
                <tr key={g.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{g.fecha}</td>
                  <td><strong>{g.Producto?.nombre || '—'}</strong></td>
                  <td>{g.descripcion}</td>
                  <td><span className="badge badge-yellow">{g.categoria}</span></td>
                  <td><strong style={{ color: '#e03a3a' }}>{formatCOP(g.monto)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
          {gastosVehiculos.length > 0 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0',
              display: 'flex', justifyContent: 'flex-end', gap: 20 }}>
              <span style={{ fontWeight: 700 }}>
                Total gastos de vehículos:
                <span style={{ color: '#e03a3a', marginLeft: 8 }}>
                  {formatCOP(gastosVehiculos.reduce((s, g) => s + g.monto, 0))}
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Tab Capital ── */}
      {!loading && tab === 'capital' && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr><th>Fecha</th><th>Descripción</th><th>Tipo</th><th>Monto</th></tr>
            </thead>
            <tbody>
              {capital.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: '#bbb' }}>
                  No hay aportes de capital registrados
                </td></tr>
              ) : capital.map(c => (
                <tr key={c.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{c.fecha}</td>
                  <td>{c.descripcion}</td>
                  <td>
                    <span className={`badge ${c.tipo === 'inicial' ? 'badge-blue' : 'badge-green'}`}>
                      {c.tipo}
                    </span>
                  </td>
                  <td><strong style={{ color: '#2e7d32' }}>{formatCOP(c.monto)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tab Histórico mensual ── */}
      {!loading && tab === 'historico' && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mes</th><th>Ingresos</th><th>Compras</th>
                <th>Gastos admin</th><th>Egresos totales</th>
                <th>Flujo neto</th><th>Saldo acumulado</th>
              </tr>
            </thead>
            <tbody>
              {!dash?.flujoMensual?.length ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#bbb' }}>
                  Sin datos
                </td></tr>
              ) : dash.flujoMensual.map((m, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {new Date(m.mes + '-01').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
                  </td>
                  <td style={{ color: '#2e7d32', fontWeight: 600 }}>{formatCOP(m.ingresos)}</td>
                  <td style={{ color: '#e03a3a' }}>{formatCOP(m.compras)}</td>
                  <td style={{ color: '#e03a3a' }}>{formatCOP(m.gastos)}</td>
                  <td style={{ color: '#e03a3a', fontWeight: 600 }}>{formatCOP(m.egresos)}</td>
                  <td>
                    <span style={{ color: m.flujoNeto >= 0 ? '#2e7d32' : '#e03a3a', fontWeight: 700 }}>
                      {formatCOP(m.flujoNeto)}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: m.acumulado >= 0 ? '#2e7d32' : '#e03a3a', fontWeight: 700 }}>
                      {formatCOP(m.acumulado)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tab Todo ── */}
      {!loading && tab === 'todo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Ventas */}
          <div className="card table-wrap">
            <h3 style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', fontSize: '.95rem', fontWeight: 700 }}>
              💰 Ventas cerradas
            </h3>
            <table>
              <thead><tr><th>Fecha</th><th>Cliente</th><th>Total</th><th>Método</th></tr></thead>
              <tbody>
                {dash?.kpis?.totalVentas === 0 || !dash?.flujoMensual?.some(m => m.ingresos > 0) ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 16, color: '#bbb' }}>Sin ventas</td></tr>
                ) : dash.flujoMensual.filter(m => m.ingresos > 0).map((m, i) => (
                  <tr key={i}>
                    <td>{new Date(m.mes + '-01').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</td>
                    <td style={{ color: '#888' }}>—</td>
                    <td style={{ color: '#2e7d32', fontWeight: 700 }}>{formatCOP(m.ingresos)}</td>
                    <td>—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Compras */}
          <div className="card table-wrap">
            <h3 style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', fontSize: '.95rem', fontWeight: 700 }}>
              🚚 Compras
            </h3>
            <table>
              <thead><tr><th>Mes</th><th>Total compras</th></tr></thead>
              <tbody>
                {!dash?.flujoMensual?.some(m => m.compras > 0) ? (
                  <tr><td colSpan={2} style={{ textAlign: 'center', padding: 16, color: '#bbb' }}>Sin compras</td></tr>
                ) : dash.flujoMensual.filter(m => m.compras > 0).map((m, i) => (
                  <tr key={i}>
                    <td>{new Date(m.mes + '-01').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</td>
                    <td style={{ color: '#e03a3a', fontWeight: 700 }}>{formatCOP(m.compras)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Gastos Administrativos */}
          <div className="card table-wrap">
            <h3 style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', fontSize: '.95rem', fontWeight: 700 }}>
              📋 Gastos administrativos
            </h3>
            <table>
              <thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Monto</th></tr></thead>
              <tbody>
                {gastos.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 16, color: '#bbb' }}>Sin gastos</td></tr>
                ) : gastos.map(g => (
                  <tr key={g.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{g.fecha}</td>
                    <td>{g.descripcion}</td>
                    <td><span className="badge badge-yellow">{g.categoria}</span></td>
                    <td style={{ color: '#e03a3a', fontWeight: 700 }}>{formatCOP(g.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Gastos por Vehículo Integrado en el Todo */}
          <div className="card table-wrap">
            <h3 style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', fontSize: '.95rem', fontWeight: 700 }}>
              🚗 Gastos por vehículos
            </h3>
            <table>
              <thead>
                <tr><th>Fecha</th><th>Vehículo</th><th>Descripción</th><th>Categoría</th><th>Monto</th></tr>
              </thead>
              <tbody>
                {gastosVehiculos.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 16, color: '#bbb' }}>No hay gastos de vehículos</td></tr>
                ) : gastosVehiculos.map(g => (
                  <tr key={g.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{g.fecha}</td>
                    <td><strong>{g.Producto?.nombre || '—'}</strong></td>
                    <td>{g.descripcion}</td>
                    <td><span className="badge badge-yellow">{g.categoria}</span></td>
                    <td style={{ color: '#e03a3a', fontWeight: 700 }}>{formatCOP(g.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Capital */}
          <div className="card table-wrap">
            <h3 style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', fontSize: '.95rem', fontWeight: 700 }}>
              💼 Capital e inversiones
            </h3>
            <table>
              <thead><tr><th>Fecha</th><th>Descripción</th><th>Tipo</th><th>Monto</th></tr></thead>
              <tbody>
                {capital.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 16, color: '#bbb' }}>Sin aportes</td></tr>
                ) : capital.map(c => (
                  <tr key={c.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{c.fecha}</td>
                    <td>{c.descripcion}</td>
                    <td><span className={`badge ${c.tipo === 'inicial' ? 'badge-blue' : 'badge-green'}`}>{c.tipo}</span></td>
                    <td style={{ color: '#2e7d32', fontWeight: 700 }}>{formatCOP(c.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resumen total */}
          <div className={`finanzas-hero ${kpis?.valorNetoCaja >= 0 ? 'hero-positivo' : 'hero-negativo'}`}>
            <div>
              <p className="hero-label">Resumen financiero completo</p>
              <p className={`hero-numero ${kpis?.valorNetoCaja >= 0 ? 'positivo' : 'negativo'}`}>
                {formatCOP(kpis?.valorNetoCaja)}
              </p>
              <p className="hero-sub">Valor Neto de Caja</p>
            </div>
            <div className="hero-divider" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p className="hero-sub">Ingresos: <strong style={{ color: '#4caf50' }}>{formatCOP(kpis?.totalVentas)}</strong></p>
              <p className="hero-sub">Egresos: <strong style={{ color: '#ef5350' }}>{formatCOP(kpis?.totalEgresos)}</strong></p>
              <p className="hero-sub">Capital: <strong style={{ color: '#90caf9' }}>{formatCOP(kpis?.totalCapital)}</strong></p>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar gasto */}
      {showGasto && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>➕ Agregar gasto administrativo</h3>
            <form onSubmit={guardarGasto}
              style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field"><label>Descripción *</label>
                <input required value={formGasto.descripcion}
                  onChange={e => setFormGasto({ ...formGasto, descripcion: e.target.value })}
                  placeholder="Ej: Pago de luz mayo" autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field"><label>Categoría</label>
                  <select value={formGasto.categoria}
                    onChange={e => setFormGasto({ ...formGasto, categoria: e.target.value })}>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field"><label>Monto *</label>
                  <input required type="number" min="0" placeholder="0"
                    value={formGasto.monto}
                    onChange={e => setFormGasto({ ...formGasto, monto: e.target.value })} />
                </div>
              </div>
              <div className="field"><label>Fecha *</label>
                <input required type="date" value={formGasto.fecha}
                  onChange={e => setFormGasto({ ...formGasto, fecha: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-secondary"
                  onClick={() => setShowGasto(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar gasto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal inyectar capital */}
      {showCapital && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>💼 Registrar capital</h3>
            <form onSubmit={guardarCapital}
              style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field"><label>Descripción *</label>
                <input required value={formCapital.descripcion}
                  onChange={e => setFormCapital({ ...formCapital, descripcion: e.target.value })}
                  placeholder="Ej: Inversión inicial socios" autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field"><label>Tipo</label>
                  <select value={formCapital.tipo}
                    onChange={e => setFormCapital({ ...formCapital, tipo: e.target.value })}>
                    <option value="inicial">Inversión inicial</option>
                    <option value="aporte">Aporte adicional</option>
                  </select>
                </div>
                <div className="field"><label>Monto *</label>
                  <input required type="number" min="0" placeholder="0"
                    value={formCapital.monto}
                    onChange={e => setFormCapital({ ...formCapital, monto: e.target.value })} />
                </div>
              </div>
              <div className="field"><label>Fecha *</label>
                <input required type="date" value={formCapital.fecha}
                  onChange={e => setFormCapital({ ...formCapital, fecha: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-secondary"
                  onClick={() => setShowCapital(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar gasto */}
      {pendingDelete && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>¿Eliminar gasto?</h3>
            <p style={{ color: '#888', fontSize: '.9rem', margin: '10px 0 20px' }}>
              Se eliminará <strong>{pendingDelete.desc}</strong>. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setPendingDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={eliminarGasto}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}