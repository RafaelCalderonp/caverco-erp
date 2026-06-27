import { useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useEmpresa } from '../../context/EmpresaContext'
import logo from '../../assets/caverco-logo.png'

const NAV = [
  { to: '/dashboard',     icon: '📊', label: 'Dashboard' },
  { to: '/empresas',      icon: '🏛️', label: 'Empresas' },
  { to: '/empleados',     icon: '👥', label: 'Empleados' },
  { to: '/departamentos', icon: '🏢', label: 'Departamentos' },
  { to: '/licencias',     icon: '📋', label: 'Licencias' },
  { to: '/contratos',     icon: '📄', label: 'Contratos' },
  { to: '/liquidaciones',  icon: '💵', label: 'Liquidaciones' },
  { to: '/usuarios',      icon: '🛡️', label: 'Usuarios', roles: ['SUPERADMIN', 'ADMIN'] },
  { to: '/configuracion', icon: '🔑', label: 'Configuración' },
]

const REQUIERE_EMPRESA = ['/empleados', '/departamentos', '/licencias', '/contratos', '/liquidaciones']
const STORAGE_KEY = 'sidebarColapsado'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { usuario, logout } = useAuth()
  const { empresaActual } = useEmpresa()
  const [colapsado, setColapsado] = useState(() => localStorage.getItem(STORAGE_KEY) === '1')
  const pageTitle = NAV.find(n => location.pathname.startsWith(n.to))?.label || 'Caverco ERP'

  function onLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function toggleColapsado() {
    const next = !colapsado
    setColapsado(next)
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
  }

  return (
    <div className={`layout${colapsado ? ' sidebar-colapsado' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img
            src={empresaActual?.logo_url || logo}
            alt="Caverco"
            style={{ height: 28, objectFit: 'contain', background: empresaActual?.logo_url ? 'transparent' : '#fff', borderRadius: 6, padding: empresaActual?.logo_url ? 0 : '4px 8px', flexShrink: 0 }}
          />
          <span className="sidebar-logo-label">{empresaActual ? empresaActual.razon_social : 'Recursos Humanos'}</span>
        </div>
        <div className="sidebar-section">Módulos</div>
        <nav>
          {NAV.filter(n => !n.roles || n.roles.includes(usuario?.rol)).map(({ to, icon, label }) => {
            const disabled = REQUIERE_EMPRESA.includes(to) && !empresaActual
            return disabled ? (
              <span key={to} className="nav-item" style={{ opacity: .4, cursor: 'not-allowed' }} title="Selecciona una empresa primero">
                <span className="nav-icon">{icon}</span>
                <span className="nav-label">{label}</span>
              </span>
            ) : (
              <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} title={label}>
                <span className="nav-icon">{icon}</span>
                <span className="nav-label">{label}</span>
              </NavLink>
            )
          })}
        </nav>
        <button className="sidebar-toggle" onClick={toggleColapsado} title={colapsado ? 'Expandir menú' : 'Colapsar menú'}>
          {colapsado ? '»' : '«'}
        </button>
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
