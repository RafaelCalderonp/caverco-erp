import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useEmpresa } from '../../context/EmpresaContext'
import { empleadosApi } from '../../services/api'
import logo from '../../assets/caverco-logo.png'

const NAV = [
  { to: '/seleccionar-empresa', icon: '🏠', label: 'Home' },
  { to: '/empresas',      icon: '🏛️', label: 'Empresas' },
  { to: '/dashboard',     icon: '📊', label: 'Dashboard' },
  { section: 'RRHH' },
  { to: '/empleados',     icon: '👥', label: 'Trabajadores' },
  { to: '/catalogos',     icon: '⚙️', label: 'Operación' },
  { to: '/licencias',     icon: '📋', label: 'Licencias' },
  { to: '/capacitaciones', icon: '🎓', label: 'Capacitaciones' },
  { to: '/contratos',     icon: '📄', label: 'Contratos' },
  { to: '/solicitudes-contrato', icon: '🔗', label: 'Solicitudes de Contrato' },
  { to: '/liquidaciones',  icon: '💵', label: 'Liquidaciones' },
  { section: 'Contabilidad' },
  { to: '/contabilidad',  icon: '🧮', label: 'Contabilidad' },
  { to: '/plan-cuentas',       icon: '📒', label: 'Plan de Cuentas' },
  { to: '/libro-diario',       icon: '📓', label: 'Libro Diario' },
  { to: '/balance-8-columnas',        icon: '⚖️', label: 'Balance 8 Col.' },
  { to: '/estado-resultados',        icon: '📈', label: 'Estado de Resultados' },
  { to: '/balance-clasificado',      icon: '🏦', label: 'Balance Clasificado' },
  { to: '/renta-liquida',            icon: '🧾', label: 'Propuesta BI / RLI' },
  { to: '/config-asientos-remuneraciones', icon: '🔗', label: 'Config. Asientos Remun.' },
  { to: '/plantillas-contabilizacion', icon: '🗂️', label: 'Plantillas' },
  { section: null },
  { to: '/usuarios',      icon: '🛡️', label: 'Usuarios', roles: ['SUPERADMIN', 'ADMIN'] },
  { to: '/configuracion', icon: '🔑', label: 'Configuración' },
]

const REQUIERE_EMPRESA = ['/dashboard', '/empleados', '/catalogos', '/licencias', '/capacitaciones', '/contratos', '/solicitudes-contrato', '/liquidaciones', '/contabilidad', '/plan-cuentas', '/libro-diario', '/balance-8-columnas', '/estado-resultados', '/balance-clasificado', '/renta-liquida', '/plantillas-contabilizacion', '/config-asientos-remuneraciones']
const STORAGE_KEY = 'sidebarColapsado'

function CampanaAlertas({ empresaActual }) {
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const [pendientes, setPendientes] = useState([])

  useEffect(() => {
    if (!empresaActual) { setPendientes([]); return }
    empleadosApi.alertasPendientes(empresaActual.id)
      .then(r => setPendientes(r.data))
      .catch(() => setPendientes([]))
  }, [empresaActual])

  if (!empresaActual) return null

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setAbierto(v => !v)}
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: 4 }}
        title="Alertas pendientes">
        🔔
        {pendientes.length > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2, background: 'var(--danger)', color: '#fff',
            borderRadius: '50%', minWidth: 16, height: 16, fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
          }}>{pendientes.length}</span>
        )}
      </button>

      {abierto && (
        <>
          <div onClick={() => setAbierto(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
          <div style={{
            position: 'absolute', right: 0, top: '120%', width: 340, zIndex: 11,
            background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,.12)', maxHeight: 400, overflowY: 'auto',
          }}>
            <div style={{ padding: '10px 14px', fontWeight: 600, fontSize: 13, borderBottom: '1px solid var(--gray-100)' }}>
              Alertas pendientes
            </div>
            {pendientes.length === 0 ? (
              <div style={{ padding: 16, fontSize: 13, color: 'var(--gray-500)' }}>Sin alertas pendientes 🎉</div>
            ) : pendientes.map(p => (
              <div key={p.id_empleado}
                onClick={() => { setAbierto(false); navigate(`/contratos/${p.id_contrato}`) }}
                style={{ padding: '10px 14px', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer', fontSize: 12.5 }}>
                <div style={{ fontWeight: 600 }}>⚠️ Finiquito pendiente</div>
                <div style={{ color: 'var(--gray-600)', margin: '2px 0' }}>{p.nombre}</div>
                <div style={{ color: '#92400e', fontSize: 11.5 }}>Recuerda también dar de baja en Previred</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { usuario, logout } = useAuth()
  const { empresaActual, cargando: cargandoEmpresas, errorConexion, recargarEmpresas } = useEmpresa()
  const [colapsado, setColapsado] = useState(() => localStorage.getItem(STORAGE_KEY) === '1')
  const pageTitle = NAV.find(n => n.to && location.pathname.startsWith(n.to))?.label || 'Caverco ERP'
  const enSeleccionEmpresa = location.pathname.startsWith('/seleccionar-empresa')

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
            src={logo}
            alt="Caverco"
            style={{ height: 28, objectFit: 'contain', background: '#fff', borderRadius: 6, padding: '4px 8px', flexShrink: 0 }}
          />
          <span className="sidebar-logo-label">Caverco Partners SpA</span>
        </div>
        <nav>
          {NAV.filter(n => n.section !== undefined || !n.roles || n.roles.includes(usuario?.rol)).map((item, i) => {
            if (item.section !== undefined) {
              return item.section
                ? <div key={`section-${i}`} className="sidebar-section">{item.section}</div>
                : null
            }
            const { to, icon, label } = item
            const disabled = REQUIERE_EMPRESA.includes(to) && (!empresaActual || enSeleccionEmpresa)
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
            {empresaActual && location.pathname !== '/seleccionar-empresa' && (
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/seleccionar-empresa')}
                style={{display:'inline-flex', alignItems:'center', gap:6}}>
                <img src={empresaActual.logo_url || logo} alt="" style={{height:18, objectFit:'contain'}} />
                {empresaActual.razon_social} · Cambiar
              </button>
            )}
            <CampanaAlertas empresaActual={empresaActual} />
            <div className="avatar">{(usuario?.username || '??').slice(0, 2).toUpperCase()}</div>
            <span style={{fontSize:13, color:'var(--gray-700)'}}>{usuario?.username} · {usuario?.rol}</span>
            <button onClick={onLogout} style={{marginLeft: 12}}>Salir</button>
          </div>
        </header>
        {errorConexion && (
          <div style={{
            padding: '14px 20px', background: '#fef3c7', borderBottom: '1px solid #fbbf24',
            display: 'flex', alignItems: 'center', gap: 12, fontSize: 14,
          }}>
            <span style={{fontSize:18}}>⚠️</span>
            <span style={{flex:1, color:'#92400e', fontWeight:500}}>
              No se pudo conectar al servidor. Las empresas pueden no estar cargadas.
              El servidor puede estar iniciando — esto es normal tras un período de inactividad.
            </span>
            <button className="btn btn-sm" style={{background:'#f59e0b',color:'#fff',border:'none'}}
              onClick={recargarEmpresas} disabled={cargandoEmpresas}>
              {cargandoEmpresas ? 'Conectando…' : '🔄 Reintentar'}
            </button>
          </div>
        )}
        {cargandoEmpresas && !errorConexion && (
          <div style={{
            padding: '8px 20px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe',
            fontSize: 13, color: '#1d4ed8',
          }}>
            ⏳ Conectando con el servidor… (puede tomar hasta 60 segundos si estaba inactivo)
          </div>
        )}
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
