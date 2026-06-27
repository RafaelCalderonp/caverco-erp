import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { empleadosApi } from '../services/api'
import { useEmpresa } from '../context/EmpresaContext'

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, activos: 0, inactivos: 0 })
  const { empresaActual } = useEmpresa()

  useEffect(() => {
    empleadosApi.stats().then(r => setStats(r.data)).catch(() => {})
  }, [empresaActual])

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard RRHH {empresaActual && <span className="text-muted" style={{fontWeight:400, fontSize:15}}>· {empresaActual.razon_social}</span>}</h1>
        <Link to="/empleados/nuevo" className="btn btn-primary">+ Nuevo Empleado</Link>
      </div>

      <div className="stat-grid">
        <div className="stat-card blue">
          <span className="label">Total Empleados</span>
          <span className="value">{stats.total}</span>
          <span className="sub">En la organización</span>
        </div>
        <div className="stat-card green">
          <span className="label">Activos</span>
          <span className="value">{stats.activos}</span>
          <span className="sub">Con contrato vigente</span>
        </div>
        <div className="stat-card red">
          <span className="label">Inactivos</span>
          <span className="value">{stats.inactivos}</span>
          <span className="sub">Egresados</span>
        </div>
        <div className="stat-card orange">
          <span className="label">Módulo</span>
          <span className="value" style={{fontSize:16,paddingTop:4}}>RRHH</span>
          <span className="sub">Caverco ERP v1.0</span>
        </div>
      </div>

      <div className="card">
        <p style={{color:'var(--gray-500)',fontSize:13}}>
          Próximamente: gráficos de dotación por departamento, vencimiento de contratos y alertas de licencias.
        </p>
      </div>
    </div>
  )
}
