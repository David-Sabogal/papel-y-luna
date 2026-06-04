import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const adminItems = [
  { to: '/venta',       icon: '🛒', label: 'Nueva Venta' },
  { to: '/historial',   icon: '📋', label: 'Ventas' },
  { to: '/productos',   icon: '📦', label: 'Productos' },
  { to: '/categorias',  icon: '🗂️',  label: 'Categorías' },
  { to: '/descuentos',  icon: '🏷️',  label: 'Descuentos' },
  { to: '/compras',     icon: '🚚', label: 'Compras' },
  { to: '/proveedores', icon: '🤝', label: 'Proveedores' },
  { to: '/clientes',    icon: '👥', label: 'Clientes' },
  { to: '/faltantes',   icon: '⚠️',  label: 'Faltantes' },
  { to: '/finanzas', icon: '💰', label: 'Finanzas' },
  { to: '/reportes',    icon: '📊', label: 'Reportes' },
];

const cajeroItems = [
  { to: '/venta',     icon: '🛒', label: 'Nueva Venta' },
  { to: '/historial', icon: '📋', label: 'Ventas' },
  { to: '/productos', icon: '📦', label: 'Productos' },
  { to: '/clientes',  icon: '👥', label: 'Clientes' },
  { to: '/faltantes', icon: '⚠️',  label: 'Faltantes' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = user?.role === 'ADMIN' ? adminItems : cajeroItems;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">🌙</span>
        <span className="brand-name">Papel & Luna</span>
      </div>

      <div className="sidebar-user">
        <span className="user-avatar">{user?.username?.[0]?.toUpperCase()}</span>
        <div>
          <p className="user-name">{user?.username}</p>
          <p className="user-role">{user?.role}</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              'nav-item' + (isActive ? ' nav-item--active' : '')
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <button className="sidebar-logout" onClick={handleLogout}>
        <span>🚪</span> Cerrar sesión
      </button>
    </aside>
  );
}