import { useNavigate } from 'react-router-dom'
import { useEmpresa } from '../context/EmpresaContext'
import logoCaverco from '../assets/caverco-logo.png'

export default function SeleccionarEmpresa() {
  const { empresas, cargando, seleccionarEmpresa } = useEmpresa()
  const navigate = useNavigate()

  function elegir(emp) {
    seleccionarEmpresa(emp)
    navigate('/dashboard')
  }

  if (cargando) return null

  return (
    <div>
      <div className="page-header">
        <h1>Selecciona una empresa</h1>
        <button className="btn btn-outline" onClick={() => navigate('/empresas')}>Administrar empresas</button>
      </div>

      {empresas.length === 0 ? (
        <div className="card">
          <p className="text-muted">Aún no hay empresas registradas.</p>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/empresas')}>+ Crear primera empresa</button>
        </div>
      ) : (
        <div className="stat-grid">
          {empresas.map(emp => (
            <button
              key={emp.id}
              onClick={() => elegir(emp)}
              className="card"
              style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <img src={emp.logo_url || logoCaverco} alt="" style={{ height: 32, objectFit: 'contain', alignSelf: 'flex-start' }} />
              <strong style={{ fontSize: 14.5 }}>{emp.razon_social}</strong>
              <span className="text-muted" style={{ fontSize: 12.5 }}>{emp.rut}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
