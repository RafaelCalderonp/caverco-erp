import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { empleadosApi } from '../services/api'

export default function Empleados() {
  const [empleados, setEmpleados] = useState([])
  const [buscar, setBuscar] = useState('')
  const [loading, setLoading] = useState(true)

  const cargar = () => {
    setLoading(true)
    empleadosApi.list({ buscar: buscar || undefined, activo: true })
      .then(r => setEmpleados(r.data))
      .catch(() => setEmpleados([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [buscar])

  const initials = (e) => `${e.nombres?.[0] || ''}${e.apellido_paterno?.[0] || ''}`.toUpperCase()
  const fmt = (n) => n ? `$${Number(n).toLocaleString('es-CL')}` : '—'

  const desactivar = async (e) => {
    if (!confirm(`¿Desactivar a ${e.nombres} ${e.apellido_paterno}?`)) return
    try {
      await empleadosApi.delete(e.id)
      cargar()
    } catch {
      alert('No se pudo desactivar al trabajador')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Trabajadores</h1>
        <Link to="/empleados/nuevo" className="btn btn-primary">+ Nuevo Trabajador</Link>
      </div>

      <div className="search-bar">
        <input className="input" placeholder="Buscar por nombre o RUT…" value={buscar}
          onChange={e => setBuscar(e.target.value)} />
      </div>

      <div className="card" style={{padding:0}}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Trabajador</th>
                <th>RUT</th>
                <th>Cargo</th>
                <th>Departamento</th>
                <th>Sueldo Base</th>
                <th>Ingreso</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} style={{textAlign:'center',padding:32,color:'var(--gray-500)'}}>Cargando…</td></tr>
              )}
              {!loading && empleados.length === 0 && (
                <tr><td colSpan={8} style={{textAlign:'center',padding:32,color:'var(--gray-500)'}}>Sin resultados</td></tr>
              )}
              {empleados.map(e => (
                <tr key={e.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="avatar">{initials(e)}</div>
                      <span>{e.nombres} {e.apellido_paterno}</span>
                    </div>
                  </td>
                  <td className="text-muted">{e.rut}</td>
                  <td>{e.cargo?.nombre || '—'}</td>
                  <td>{e.departamento?.nombre || '—'}</td>
                  <td>{fmt(e.sueldo_base)}</td>
                  <td className="text-muted">{e.fecha_ingreso}</td>
                  <td>
                    <span className={`badge ${e.activo ? 'badge-green' : 'badge-red'}`}>
                      {e.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link to={`/empleados/${e.id}`} className="btn btn-outline btn-sm">Ver</Link>
                      <button className="btn btn-outline btn-sm" style={{color:'var(--danger)'}} onClick={() => desactivar(e)}>
                        Desactivar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
