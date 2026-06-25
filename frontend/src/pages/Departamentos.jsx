import { useState, useEffect } from 'react'
import { departamentosApi } from '../services/api'

export default function Departamentos() {
  const [deps, setDeps] = useState([])

  useEffect(() => {
    departamentosApi.list().then(r => setDeps(r.data)).catch(() => {})
  }, [])

  return (
    <div>
      <div className="page-header">
        <h1>Departamentos</h1>
      </div>
      <div className="card" style={{padding:0}}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Código</th><th>Nombre</th><th>Descripción</th><th>Estado</th></tr></thead>
            <tbody>
              {deps.map(d => (
                <tr key={d.id}>
                  <td><span className="badge badge-blue">{d.codigo}</span></td>
                  <td style={{fontWeight:500}}>{d.nombre}</td>
                  <td className="text-muted">{d.descripcion || '—'}</td>
                  <td><span className={`badge ${d.activo ? 'badge-green' : 'badge-red'}`}>{d.activo ? 'Activo' : 'Inactivo'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
