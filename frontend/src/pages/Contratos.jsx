import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { contratosApi, catalogosApi } from '../services/api'

const ESTADO_BADGE = { vigente: 'badge-green', finiquitado: 'badge-red', anulado: 'badge-gray' }

const ORDEN_OPTS = [
  { value: 'numero_asc',  label: 'N° Contrato ↑' },
  { value: 'numero_desc', label: 'N° Contrato ↓' },
  { value: 'nombre_asc',  label: 'Empleado A→Z' },
  { value: 'nombre_desc', label: 'Empleado Z→A' },
  { value: 'fecha_asc',   label: 'Fecha Inicio ↑' },
  { value: 'fecha_desc',  label: 'Fecha Inicio ↓' },
  { value: 'sueldo_desc', label: 'Sueldo Mayor' },
  { value: 'sueldo_asc',  label: 'Sueldo Menor' },
]

export default function Contratos() {
  const [contratos, setContratos]       = useState([])
  const [estado, setEstado]             = useState('vigente')
  const [centroCosto, setCentroCosto]   = useState('')
  const [orden, setOrden]               = useState('numero_asc')
  const [centrosCosto, setCentrosCosto] = useState([])
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    catalogosApi.centrosCosto().then(r => setCentrosCosto(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    contratosApi.list({ estado: estado || undefined })
      .then(r => setContratos(r.data))
      .catch(() => setContratos([]))
      .finally(() => setLoading(false))
  }, [estado])

  const fmt = (n) => n ? `$${Number(n).toLocaleString('es-CL')}` : '—'

  const diasParaVencer = (c) => {
    if (c.estado !== 'vigente' || !c.fecha_termino_pactada) return null
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    const fin = new Date(c.fecha_termino_pactada + 'T00:00:00')
    return Math.round((fin - hoy) / 86400000)
  }

  const lista = useMemo(() => {
    let r = [...contratos]

    // Filtro centro de costo (client-side)
    if (centroCosto) r = r.filter(c => String(c.id_centro_costo) === centroCosto)

    // Ordenar
    r.sort((a, b) => {
      switch (orden) {
        case 'numero_asc':  return (a.numero_contrato || '').localeCompare(b.numero_contrato || '')
        case 'numero_desc': return (b.numero_contrato || '').localeCompare(a.numero_contrato || '')
        case 'nombre_asc':  return `${a.empleado?.apellido_paterno}`.localeCompare(`${b.empleado?.apellido_paterno}`)
        case 'nombre_desc': return `${b.empleado?.apellido_paterno}`.localeCompare(`${a.empleado?.apellido_paterno}`)
        case 'fecha_asc':   return (a.fecha_inicio || '').localeCompare(b.fecha_inicio || '')
        case 'fecha_desc':  return (b.fecha_inicio || '').localeCompare(a.fecha_inicio || '')
        case 'sueldo_asc':  return Number(a.sueldo_bruto) - Number(b.sueldo_bruto)
        case 'sueldo_desc': return Number(b.sueldo_bruto) - Number(a.sueldo_bruto)
        default: return 0
      }
    })
    return r
  }, [contratos, centroCosto, orden])

  return (
    <div>
      <div className="page-header">
        <h1>Contratos</h1>
        <Link to="/contratos/nuevo" className="btn btn-primary">+ Nuevo Contrato</Link>
      </div>

      <div className="search-bar" style={{display:'flex', gap:10, flexWrap:'wrap'}}>
        <select className="input" value={estado} onChange={e => setEstado(e.target.value)} style={{maxWidth:200}}>
          <option value="">Todos los estados</option>
          <option value="vigente">Vigente</option>
          <option value="finiquitado">Finiquitado</option>
          <option value="anulado">Anulado</option>
        </select>

        <select className="input" value={centroCosto} onChange={e => setCentroCosto(e.target.value)} style={{maxWidth:240}}>
          <option value="">Todos los centros de costo</option>
          {centrosCosto.map(c => (
            <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
          ))}
        </select>

        <select className="input" value={orden} onChange={e => setOrden(e.target.value)} style={{maxWidth:200}}>
          {ORDEN_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {(centroCosto || estado !== 'vigente') && (
          <button className="btn btn-outline btn-sm" style={{alignSelf:'center'}}
            onClick={() => { setEstado('vigente'); setCentroCosto('') }}>
            ✕ Limpiar filtros
          </button>
        )}
      </div>

      <div style={{fontSize:12, color:'var(--gray-500)', marginBottom:8}}>
        {lista.length} contrato{lista.length !== 1 ? 's' : ''}
        {centroCosto && ` · ${centrosCosto.find(c => String(c.id) === centroCosto)?.nombre}`}
      </div>

      <div className="card" style={{padding:0}}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>N° Contrato</th>
                <th>Empleado</th>
                <th>Centro de Costo</th>
                <th>Fecha Inicio</th>
                <th>Sueldo Bruto</th>
                <th>Jornada</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} style={{textAlign:'center',padding:32,color:'var(--gray-500)'}}>Cargando…</td></tr>
              )}
              {!loading && lista.length === 0 && (
                <tr><td colSpan={8} style={{textAlign:'center',padding:32,color:'var(--gray-500)'}}>Sin resultados</td></tr>
              )}
              {lista.map(c => {
                const dias = diasParaVencer(c)
                const cc = centrosCosto.find(x => x.id === c.id_centro_costo)
                return (
                <tr key={c.id}>
                  <td>{c.numero_contrato || `#${c.id}`}</td>
                  <td className="text-muted">
                    {c.empleado ? `${c.empleado.codigo || '#' + c.empleado.id} — ${c.empleado.nombres} ${c.empleado.apellido_paterno}` : `Empleado #${c.id_empleado}`}
                  </td>
                  <td className="text-muted">{cc ? `${cc.codigo} — ${cc.nombre}` : '—'}</td>
                  <td className="text-muted">{c.fecha_inicio}</td>
                  <td>{fmt(c.sueldo_bruto)}</td>
                  <td>{c.jornada}</td>
                  <td>
                    <span className={`badge ${ESTADO_BADGE[c.estado] || 'badge-gray'}`}>{c.estado}</span>
                    {dias !== null && dias <= 7 && (
                      <span className={`badge ${dias <= 1 ? 'badge-red' : 'badge-orange'}`} style={{marginLeft:6}}>
                        {dias < 0 ? `Vencido hace ${Math.abs(dias)}d` : dias === 0 ? '¡Vence hoy!' : `Vence en ${dias}d`}
                      </span>
                    )}
                  </td>
                  <td>
                    <Link to={`/contratos/${c.id}`} className="btn btn-outline btn-sm">Ver</Link>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
