import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useEmpresa } from '../../context/EmpresaContext'

const NAV = [
  { to: '/dashboard',     icon: '📊', label: 'Dashboard' },
  { to: '/empresas',      icon: '🏛️', label: 'Empresas' },
  { to: '/empleados',     icon: '👥', label: 'Empleados' },
  { to: '/departamentos', icon: '🏢', label: 'Departamentos' },
  { to: '/licencias',     icon: '📋', label: 'Licencias' },
  { to: '/contratos',     icon: '📄', label: 'Contratos' },
  { to: '/liquidaciones',  icon: '💵', label: 'Liquidaciones' },
  { to: '/configuracion', icon: '🔑', label: 'Configuración' },
]

const REQUIERE_EMPRESA = ['/empleados', '/departamentos', '/licencias', '/contratos', '/liquidaciones']

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { usuario, logout } = useAuth()
  const { empresaActual } = useEmpresa()
  const pageTitle = NAV.find(n => location.pathname.startsWith(n.to))?.label || 'Caverco ERP'

  function onLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          {empresaActual?.logo_url
            ? <img src={empresaActual.logo_url} alt="" style={{ height: 28, marginBottom: 6, objectFit: 'contain' }} />
            : <h1>⚙️ Caverco ERP</h1>}
          <span>{empresaActual ? empresaActual.razon_social : 'Recursos Humanos'}</span>
        </div>
        <div className="sidebar-section">Módulos</div>
        <nav>
          {NAV.map(({ to, icon, label }) => {
            const disabled = REQUIERE_EMPRESA.includes(to) && !empresaActual
            return disabled ? (
              <span key={to} className="nav-item" style={{ opacity: .4, cursor: 'not-allowed' }} title="Selecciona una empresa primero">
                <span className="nav-icon">{icon}</span>
                {label}
              </span>
            ) : (
              <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <span className="nav-icon">{icon}</span>
                {label}
              </NavLink>
            )
          })}
        </nav>
        <div className="sidebar-footer">v1.0.0 · Módulo RRHH</div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h2>{pageTitle}</h2>
          <div className="topbar-right">
            {empresaActual && (
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/seleccionar-empresa')}>
                🏢 {empresaActual.razon_social} · Cambiar
              </button>
            )}
            <div className="avatar">{(usuario?.username || '??').slice(0, 2).toUpperCase()}</div>
            <span style={{fontSize:13, color:'var(--gray-700)'}}>{usuario?.username} · {usuario?.rol}</span>
            <button onClick={onLogout} style={{marginLeft: 12}}>Salir</button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
