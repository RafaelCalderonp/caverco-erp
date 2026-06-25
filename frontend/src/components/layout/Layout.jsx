import { Outlet, NavLink, useLocation } from 'react-router-dom'

const NAV = [
  { to: '/dashboard',     icon: '📊', label: 'Dashboard' },
  { to: '/empleados',     icon: '👥', label: 'Empleados' },
  { to: '/departamentos', icon: '🏢', label: 'Departamentos' },
  { to: '/licencias',     icon: '📋', label: 'Licencias' },
  { to: '/liquidaciones',  icon: '💵', label: 'Liquidaciones' },
]

export default function Layout() {
  const location = useLocation()
  const pageTitle = NAV.find(n => location.pathname.startsWith(n.to))?.label || 'Caverco ERP'

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>⚙️ Caverco ERP</h1>
          <span>Recursos Humanos</span>
        </div>
        <div className="sidebar-section">Módulos</div>
        <nav>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">v1.0.0 · Módulo RRHH</div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h2>{pageTitle}</h2>
          <div className="topbar-right">
            <div className="avatar">AD</div>
            <span style={{fontSize:13, color:'var(--gray-700)'}}>Administrador</span>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
