import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { contratosApi } from '../services/api'

const ESTADO_BADGE = { vigente: 'badge-green', finiquitado: 'badge-red', anulado: 'badge-gray' }

export default function Contratos() {
  const [contratos, setContratos] = useState([])
  const [estado, setEstado] = useState('vigente')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    contratosApi.list({ estado: estado || undefined })
      .then(r => setContratos(r.data))
      .catch(() => setContratos([]))
      .finally(() => setLoading(false))
  }, [estado])

  const fmt = (n) => n ? `$${Number(n).toLocaleString('es-CL')}` : '—'

  return (
    <div>
      <div className="page-header">
        <h1>Contratos</h1>
        <Link to="/contratos/nuevo" className="btn btn-primary">+ Nuevo Contrato</Link>
      </div>

      <div className="search-bar">
        <select className="input" value={estado} onChange={e => setEstado(e.target.value)} style={{maxWidth:220}}>
          <option value="">Todos los estados</option>
          <option value="vigente">Vigente</option>
          <option value="finiquitado">Finiquitado</option>
          <option value="anulado">Anulado</option>
        </select>
      </div>

      <div className="card" style={{padding:0}}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>N° Contrato</th>
                <th>Empleado</th>
                <th>Fecha Inicio</th>
                <th>Sueldo Bruto</th>
                <th>Jornada</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'var(--gray-500)'}}>Cargando…</td></tr>
              )}
              {!loading && contratos.length === 0 && (
                <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'var(--gray-500)'}}>Sin resultados</td></tr>
              )}
              {contratos.map(c => (
                <tr key={c.id}>
                  <td>{c.numero_contrato || `#${c.id}`}</td>
                  <td className="text-muted">
                    {c.empleado ? `${c.empleado.codigo || '#' + c.empleado.id} — ${c.empleado.nombres} ${c.empleado.apellido_paterno}` : `Empleado #${c.id_empleado}`}
                  </td>
                  <td className="text-muted">{c.fecha_inicio}</td>
                  <td>{fmt(c.sueldo_bruto)}</td>
                  <td>{c.jornada}</td>
                  <td>
                    <span className={`badge ${ESTADO_BADGE[c.estado] || 'badge-gray'}`}>{c.estado}</span>
                  </td>
                  <td>
                    <Link to={`/contratos/${c.id}`} className="btn btn-outline btn-sm">Ver</Link>
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
