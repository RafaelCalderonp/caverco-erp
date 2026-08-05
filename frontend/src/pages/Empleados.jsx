import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { empleadosApi } from '../services/api'

function IconBtn({ as: Tag = 'button', icon, title, danger, ...props }) {
  return (
    <Tag
      title={title}
      aria-label={title}
      {...props}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 16, height: 16, borderRadius: '50%',
        border: `1px solid ${danger ? 'var(--danger)' : 'var(--gray-300)'}`,
        background: '#fff', color: danger ? 'var(--danger)' : 'var(--gray-600)',
        fontSize: 12, lineHeight: 1, cursor: 'pointer', textDecoration: 'none', overflow: 'visible',
        ...props.style,
      }}
    >
      {icon}
    </Tag>
  )
}

const COLUMNAS = [
  { key: 'codigo',      label: 'Código' },
  { key: 'nombre',      label: 'Trabajador' },
  { key: 'rut',         label: 'RUT' },
  { key: 'cargo',       label: 'Cargo' },
  { key: 'centroCosto', label: 'CC' },
  { key: 'sueldo',      label: 'Sueldo Base', num: true },
  { key: 'ingreso',     label: 'Ingreso' },
  { key: 'estado',      label: 'Estado' },
]

function valorOrden(e, key) {
  switch (key) {
    case 'codigo':      return e.codigo || ''
    case 'nombre':      return `${e.apellido_paterno} ${e.nombres}`
    case 'rut':         return e.rut || ''
    case 'cargo':       return e.cargo?.nombre || ''
    case 'centroCosto': return e.centro_costo ? `${e.centro_costo.codigo} ${e.centro_costo.nombre}` : ''
    case 'sueldo':      return Number(e.sueldo_base) || 0
    case 'ingreso':     return e.fecha_ingreso || ''
    case 'estado':      return e.activo ? 0 : 1
    default:            return ''
  }
}

export default function Empleados() {
  const [empleados, setEmpleados] = useState([])
  const [buscar, setBuscar] = useState('')
  const [loading, setLoading] = useState(true)
  const [orden, setOrden] = useState({ key: 'nombre', dir: 1 })

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
  const fmtFecha = (f) => f ? f.slice(2) : '—'  // YYYY-MM-DD -> YY-MM-DD

  const ordenarPor = (key) => {
    setOrden(o => o.key === key ? { key, dir: -o.dir } : { key, dir: 1 })
  }

  const lista = useMemo(() => {
    const r = [...empleados]
    r.sort((a, b) => {
      const va = valorOrden(a, orden.key), vb = valorOrden(b, orden.key)
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return cmp * orden.dir
    })
    return r
  }, [empleados, orden])

  const desactivar = async (e) => {
    if (!confirm(`¿Desactivar a ${e.nombres} ${e.apellido_paterno}?`)) return
    try {
      await empleadosApi.delete(e.id)
      cargar()
    } catch {
      alert('No se pudo desactivar al trabajador')
    }
  }

  const eliminarDefinitivo = async (e) => {
    if (!confirm(`Esto borrará para siempre a ${e.nombres} ${e.apellido_paterno} y su contrato, sin posibilidad de recuperarlo. ¿Continuar?`)) return
    try {
      await empleadosApi.eliminarDefinitivo(e.id)
      cargar()
    } catch (err) {
      const detalle = err.response?.data?.detail || err.message
      alert(`No se pudo eliminar al trabajador: ${detalle}`)
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
          <table style={{fontSize:12.5}}>
            <thead>
              <tr>
                {COLUMNAS.map(c => (
                  <th key={c.key} onClick={() => ordenarPor(c.key)}
                    style={{cursor:'pointer', userSelect:'none', whiteSpace:'nowrap', padding:'6px 10px'}}>
                    {c.label}{orden.key === c.key ? (orden.dir === 1 ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} style={{textAlign:'center',padding:24,color:'var(--gray-500)'}}>Cargando…</td></tr>
              )}
              {!loading && lista.length === 0 && (
                <tr><td colSpan={9} style={{textAlign:'center',padding:24,color:'var(--gray-500)'}}>Sin resultados</td></tr>
              )}
              {lista.map((e, i) => (
                <tr key={e.id} style={{background: i % 2 === 1 ? 'var(--gray-50)' : 'transparent'}}>
                  <td style={{padding:'5px 10px', whiteSpace:'nowrap'}}><span className="badge badge-blue">{e.codigo || '—'}</span></td>
                  <td style={{padding:'5px 10px'}}>
                    <div className="flex items-center gap-2">
                      <div className="avatar" style={{width:22, height:22, fontSize:10}}>{initials(e)}</div>
                      <span>{e.nombres} {e.apellido_paterno}</span>
                    </div>
                  </td>
                  <td className="text-muted" style={{padding:'5px 10px', whiteSpace:'nowrap'}}>{e.rut}</td>
                  <td style={{padding:'5px 10px'}}>{e.cargo?.nombre || '—'}</td>
                  <td className="text-muted" style={{padding:'5px 10px', whiteSpace:'nowrap'}}
                    title={e.centro_costo?.nombre || ''}>
                    {e.centro_costo?.codigo || '—'}
                  </td>
                  <td style={{padding:'5px 10px', whiteSpace:'nowrap'}}>{fmt(e.sueldo_base)}</td>
                  <td className="text-muted" style={{padding:'5px 10px', whiteSpace:'nowrap'}}>{fmtFecha(e.fecha_ingreso)}</td>
                  <td style={{padding:'5px 10px'}}>
                    <span className={`badge ${e.activo ? 'badge-green' : 'badge-red'}`}>
                      {e.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{padding:'5px 10px', display:'flex', gap:6}}>
                    <IconBtn as={Link} to={`/empleados/${e.id}`} icon="👁️" title="Ver ficha" />
                    <IconBtn icon="⏻" danger title="Desactivar" onClick={() => desactivar(e)} />
                    <IconBtn icon="✕" danger title="Eliminar" onClick={() => eliminarDefinitivo(e)} />
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
