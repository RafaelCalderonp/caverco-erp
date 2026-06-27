import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmpresa } from '../context/EmpresaContext'
import logoCaverco from '../assets/caverco-logo.png'

export default function SeleccionarEmpresa() {
  const { empresas, cargando, seleccionarEmpresa } = useEmpresa()
  const navigate = useNavigate()
  const [idElegida, setIdElegida] = useState('')

  const empresaElegida = empresas.find(e => e.id === Number(idElegida))

  function ingresar() {
    if (!empresaElegida) return
    seleccionarEmpresa(empresaElegida)
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
        <div className="card" style={{ maxWidth: 460 }}>
          <div className="form-group">
            <label className="form-label">Empresa</label>
            <select className="select" value={idElegida} onChange={e => setIdElegida(e.target.value)}>
              <option value="">Seleccionar…</option>
              {empresas.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.razon_social} — {emp.rut}</option>
              ))}
            </select>
          </div>

          {empresaElegida && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0 20px' }}>
              <img src={empresaElegida.logo_url || logoCaverco} alt="" style={{ height: 32, objectFit: 'contain' }} />
              <div>
                <strong style={{ fontSize: 14.5 }}>{empresaElegida.razon_social}</strong>
                <div className="text-muted" style={{ fontSize: 12.5 }}>{empresaElegida.rut}</div>
              </div>
            </div>
          )}

          <button className="btn btn-primary" disabled={!empresaElegida} onClick={ingresar}>
            Ingresar →
          </button>
        </div>
      )}
    </div>
  )
}
