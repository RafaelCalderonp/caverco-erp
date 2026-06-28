import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { empleadosApi } from '../services/api'

export default function EmpleadoDetalle() {
  const { id } = useParams()
  const [emp, setEmp] = useState(null)

  useEffect(() => {
    empleadosApi.get(id).then(r => setEmp(r.data)).catch(() => {})
  }, [id])

  if (!emp) return <div className="card">Cargando…</div>

  const fmt = (n) => n ? `$${Number(n).toLocaleString('es-CL')}` : '—'

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Link to="/empleados" className="btn btn-outline btn-sm">← Volver</Link>
          <h1>{emp.nombres} {emp.apellido_paterno} {emp.apellido_materno || ''}</h1>
          <span className={`badge ${emp.activo ? 'badge-green' : 'badge-red'}`}>{emp.activo ? 'Activo' : 'Inactivo'}</span>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        <div className="card">
          <h3 style={{marginBottom:16, fontWeight:600}}>Datos Personales</h3>
          {[['RUT', emp.rut],['Email Corporativo', emp.email_corporativo],['Teléfono', emp.telefono],
            ['Dirección', emp.direccion],['Ciudad', emp.ciudad]].map(([k,v]) => (
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--gray-100)'}}>
              <span className="text-muted">{k}</span><span style={{fontWeight:500}}>{v || '—'}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 style={{marginBottom:16, fontWeight:600}}>Información Laboral</h3>
          {[['Departamento', emp.departamento?.nombre],['Cargo', emp.cargo?.nombre],
            ['Fecha Ingreso', emp.fecha_ingreso],['Sueldo Base', fmt(emp.sueldo_base)]].map(([k,v]) => (
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--gray-100)'}}>
              <span className="text-muted">{k}</span><span style={{fontWeight:500}}>{v || '—'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt-4">
        <h3 style={{marginBottom:12, fontWeight:600}}>Contratos ({emp.contratos?.length || 0})</h3>
        {(!emp.contratos || emp.contratos.length === 0)
          ? <p className="text-muted">Sin contratos registrados</p>
          : emp.contratos.map(c => (
            <Link key={c.id} to={`/contratos/${c.id}`} style={{display:'block', padding:'8px 0', borderBottom:'1px solid var(--gray-100)'}}>
              Contrato {c.numero_contrato || `#${c.id}`} — Desde {c.fecha_inicio} — {fmt(c.sueldo_bruto)}
            </Link>
          ))
        }
      </div>
    </div>
  )
}
