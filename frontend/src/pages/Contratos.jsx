import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { contratosApi, catalogosApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

const ESTADO_BADGE = { vigente: 'badge-green', finiquitado: 'badge-red', anulado: 'badge-gray' }

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
  { key: 'numero',  label: 'N° Contrato' },
  { key: 'nombre',  label: 'Trabajador' },
  { key: 'cc',      label: 'CC' },
  { key: 'fecha',   label: 'Fecha Inicio' },
  { key: 'sueldo',  label: 'Sueldo Bruto', num: true },
  { key: 'jornada', label: 'Jornada' },
  { key: 'estado',  label: 'Estado' },
]

function valorOrden(c, cc, key) {
  switch (key) {
    case 'numero':  return c.numero_contrato || `#${c.id}`
    case 'nombre':  return `${c.empleado?.apellido_paterno || ''} ${c.empleado?.nombres || ''}`
    case 'cc':      return cc ? cc.codigo : ''
    case 'fecha':   return c.fecha_inicio || ''
    case 'sueldo':  return Number(c.sueldo_bruto) || 0
    case 'jornada': return c.jornada || ''
    case 'estado':  return c.estado || ''
    default:        return ''
  }
}

const FILTROS_KEY = 'contratosFiltros'
function cargarFiltrosGuardados() {
  try { return JSON.parse(localStorage.getItem(FILTROS_KEY)) || {} } catch { return {} }
}

export default function Contratos() {
  const { usuario } = useAuth()
  const filtrosGuardados = cargarFiltrosGuardados()
  const [tab, setTab]                   = useState('lista') // 'lista' | 'resumen'
  const [contratos, setContratos]       = useState([])
  const [estado, setEstado]             = useState(filtrosGuardados.estado ?? 'vigente')
  const [centroCosto, setCentroCosto]   = useState(filtrosGuardados.centroCosto ?? '')
  const [obraId, setObraId]             = useState(filtrosGuardados.obraId ?? '')
  const [buscar, setBuscar]             = useState(filtrosGuardados.buscar ?? '')
  const [orden, setOrden]               = useState(filtrosGuardados.orden ?? { key: 'numero', dir: 1 })
  const [centrosCosto, setCentrosCosto] = useState([])
  const [obras, setObras]               = useState([])
  const [cargos, setCargos]             = useState([])
  const [tiposContrato, setTiposContrato] = useState([])
  const [obraResumen, setObraResumen]   = useState('')
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    catalogosApi.centrosCosto().then(r => setCentrosCosto(r.data)).catch(() => {})
    catalogosApi.obras().then(r => setObras(r.data)).catch(() => {})
    catalogosApi.cargos().then(r => setCargos(r.data)).catch(() => {})
    catalogosApi.tiposContrato().then(r => setTiposContrato(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    localStorage.setItem(FILTROS_KEY, JSON.stringify({ estado, centroCosto, obraId, buscar, orden }))
  }, [estado, centroCosto, obraId, buscar, orden])

  useEffect(() => {
    setLoading(true)
    contratosApi.list({ estado: estado || undefined, id_obra: obraId || undefined })
      .then(r => setContratos(r.data))
      .catch(() => setContratos([]))
      .finally(() => setLoading(false))
  }, [estado, obraId])

  const fmt = (n) => n ? `$${Number(n).toLocaleString('es-CL')}` : '—'

  const eliminarContrato = async (c) => {
    const nombreEmp = c.empleado ? `${c.empleado.nombres} ${c.empleado.apellido_paterno}` : `#${c.id_empleado}`
    if (!confirm(`¿Eliminar el contrato ${c.numero_contrato || '#' + c.id} de ${nombreEmp}? Esta acción no se puede deshacer.`)) return
    try {
      await contratosApi.delete(c.id)
      setContratos(prev => prev.filter(x => x.id !== c.id))
    } catch (err) {
      alert(err.response?.data?.detail || 'No se pudo eliminar el contrato')
    }
  }

  const diasParaVencer = (c) => {
    if (c.estado !== 'vigente' || !c.fecha_termino_pactada) return null
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    const fin = new Date(c.fecha_termino_pactada + 'T00:00:00')
    return Math.round((fin - hoy) / 86400000)
  }

  const ordenarPor = (key) => {
    setOrden(o => o.key === key ? { key, dir: -o.dir } : { key, dir: 1 })
  }

  const lista = useMemo(() => {
    let r = [...contratos]

    // Filtro centro de costo (client-side)
    if (centroCosto) r = r.filter(c => String(c.id_centro_costo) === centroCosto)

    // Búsqueda por trabajador / RUT / N° contrato (client-side)
    if (buscar.trim()) {
      const term = buscar.trim().toLowerCase()
      r = r.filter(c => {
        const nombre = `${c.empleado?.nombres || ''} ${c.empleado?.apellido_paterno || ''} ${c.empleado?.apellido_materno || ''}`.toLowerCase()
        const rut = (c.empleado?.rut || '').toLowerCase()
        const numero = (c.numero_contrato || '').toLowerCase()
        return nombre.includes(term) || rut.includes(term) || numero.includes(term)
      })
    }

    // Ordenar
    r.sort((a, b) => {
      const ccA = centrosCosto.find(x => x.id === a.id_centro_costo)
      const ccB = centrosCosto.find(x => x.id === b.id_centro_costo)
      const va = valorOrden(a, ccA, orden.key), vb = valorOrden(b, ccB, orden.key)
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return cmp * orden.dir
    })
    return r
  }, [contratos, centroCosto, buscar, orden, centrosCosto])

  const resumenPorObra = useMemo(() => {
    let r = [...contratos]
    if (obraResumen) r = r.filter(c => String(c.id_obra) === obraResumen)
    if (buscar.trim()) {
      const term = buscar.trim().toLowerCase()
      r = r.filter(c => {
        const nombre = `${c.empleado?.nombres || ''} ${c.empleado?.apellido_paterno || ''} ${c.empleado?.apellido_materno || ''}`.toLowerCase()
        const rut = (c.empleado?.rut || '').toLowerCase()
        return nombre.includes(term) || rut.includes(term)
      })
    }

    const grupos = new Map()
    for (const c of r) {
      const obra = obras.find(o => o.id === c.id_obra)
      const clave = obra ? obra.nombre : 'Sin obra asignada'
      if (!grupos.has(clave)) grupos.set(clave, [])
      grupos.get(clave).push(c)
    }

    return [...grupos.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([obra, items]) => ({
        obra,
        items: items.sort((a, b) =>
          `${a.empleado?.apellido_paterno || ''} ${a.empleado?.nombres || ''}`
            .localeCompare(`${b.empleado?.apellido_paterno || ''} ${b.empleado?.nombres || ''}`)),
        totalSueldo: items.reduce((s, c) => s + (Number(c.sueldo_bruto) || 0), 0),
      }))
  }, [contratos, obraResumen, buscar, obras])

  return (
    <div>
      <div className="page-header">
        <h1>Contratos</h1>
        <div className="flex gap-2">
          <button className={`btn ${tab==='lista'?'btn-primary':'btn-outline'}`}
            onClick={() => setTab('lista')}>📋 Lista</button>
          <button className={`btn ${tab==='resumen'?'btn-primary':'btn-outline'}`}
            onClick={() => setTab('resumen')}>📊 Resumen por Obra</button>
          <Link to="/contratos/nuevo" className="btn btn-primary">+ Nuevo Contrato</Link>
        </div>
      </div>

      {tab === 'lista' && <>
      <div className="search-bar" style={{display:'flex', gap:10, flexWrap:'wrap'}}>
        <input className="input" placeholder="Buscar por trabajador, RUT o N° contrato…" value={buscar}
          onChange={e => setBuscar(e.target.value)} style={{maxWidth:260}} />

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

        <select className="input" value={obraId} onChange={e => setObraId(e.target.value)} style={{maxWidth:260}}>
          <option value="">Todas las obras</option>
          {obras.map(o => (
            <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo} — ` : ''}{o.nombre}</option>
          ))}
        </select>

        {(centroCosto || obraId || buscar || estado !== 'vigente') && (
          <button className="btn btn-outline btn-sm" style={{alignSelf:'center'}}
            onClick={() => { setEstado('vigente'); setCentroCosto(''); setObraId(''); setBuscar('') }}>
            ✕ Limpiar filtros
          </button>
        )}
      </div>

      <div style={{fontSize:12, color:'var(--gray-500)', marginBottom:8}}>
        {lista.length} contrato{lista.length !== 1 ? 's' : ''}
        {centroCosto && ` · ${centrosCosto.find(c => String(c.id) === centroCosto)?.nombre}`}
        {obraId && ` · ${obras.find(o => String(o.id) === obraId)?.nombre}`}
      </div>

      <div className="card" style={{padding:0}}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {COLUMNAS.map(c => (
                  <th key={c.key} onClick={() => ordenarPor(c.key)} style={{cursor:'pointer', userSelect:'none'}}>
                    {c.label}{orden.key === c.key ? (orden.dir === 1 ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
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
              {lista.map((c, i) => {
                const dias = diasParaVencer(c)
                const cc = centrosCosto.find(x => x.id === c.id_centro_costo)
                return (
                <tr key={c.id} style={{background: i % 2 === 1 ? 'var(--gray-50)' : 'transparent'}}>
                  <td style={{padding:'7px 14px', whiteSpace:'nowrap'}}>{c.numero_contrato || `#${c.id}`}</td>
                  <td className="text-muted" style={{padding:'7px 14px'}}>
                    {c.empleado ? `${c.empleado.nombres} ${c.empleado.apellido_paterno}` : `Trabajador #${c.id_empleado}`}
                  </td>
                  <td className="text-muted" style={{padding:'7px 14px', whiteSpace:'nowrap'}} title={cc?.nombre || ''}>{cc?.codigo || '—'}</td>
                  <td className="text-muted" style={{padding:'7px 14px', whiteSpace:'nowrap'}}>{c.fecha_inicio}</td>
                  <td style={{padding:'7px 14px'}}>{fmt(c.sueldo_bruto)}</td>
                  <td style={{padding:'7px 14px'}}>{c.jornada}</td>
                  <td style={{padding:'7px 14px'}}>
                    <span className={`badge ${ESTADO_BADGE[c.estado] || 'badge-gray'}`}>{c.estado}</span>
                    {dias !== null && dias <= 7 && (
                      <span className={`badge ${dias <= 1 ? 'badge-red' : 'badge-orange'}`} style={{marginLeft:6}}>
                        {dias < 0 ? `Vencido hace ${Math.abs(dias)}d` : dias === 0 ? '¡Vence hoy!' : `Vence en ${dias}d`}
                      </span>
                    )}
                  </td>
                  <td style={{padding:'7px 14px', display:'flex', gap:6}}>
                    <IconBtn as={Link} to={`/contratos/${c.id}`} icon="👁️" title="Ver contrato" />
                    <IconBtn as={Link} to={`/contratos/nuevo?id_empleado=${c.id_empleado}&duplicar_de=${c.id}`}
                      icon="⧉" title="Duplicar: crear un nuevo contrato para este trabajador (ej. otra obra), copiando los mismos datos salvo obra y fechas" />
                    {usuario?.rol === 'SUPERADMIN' && (
                      <IconBtn icon="✕" danger title="Eliminar contrato" onClick={() => eliminarContrato(c)} />
                    )}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
      </>}

      {tab === 'resumen' && <>
        <div className="search-bar" style={{display:'flex', gap:10, flexWrap:'wrap'}}>
          <input className="input" placeholder="Buscar por trabajador o RUT…" value={buscar}
            onChange={e => setBuscar(e.target.value)} style={{maxWidth:260}} />

          <select className="input" value={obraResumen} onChange={e => setObraResumen(e.target.value)} style={{maxWidth:260}}>
            <option value="">Todas las obras</option>
            {obras.map(o => (
              <option key={o.id} value={o.id}>{o.nombre}</option>
            ))}
          </select>

          {(obraResumen || buscar) && (
            <button className="btn btn-outline btn-sm" style={{alignSelf:'center'}}
              onClick={() => { setObraResumen(''); setBuscar('') }}>
              ✕ Limpiar filtros
            </button>
          )}
        </div>

        <div style={{fontSize:12, color:'var(--gray-500)', marginBottom:8}}>
          {resumenPorObra.reduce((n, g) => n + g.items.length, 0)} trabajador{resumenPorObra.reduce((n, g) => n + g.items.length, 0) !== 1 ? 'es' : ''} en {resumenPorObra.length} obra{resumenPorObra.length !== 1 ? 's' : ''}
          {estado && ` · estado: ${estado}`}
        </div>

        {!loading && resumenPorObra.length === 0 && (
          <div className="card" style={{padding:32, textAlign:'center', color:'var(--gray-500)'}}>Sin resultados</div>
        )}

        {resumenPorObra.map(grupo => (
          <div key={grupo.obra} className="card" style={{padding:0, marginBottom:16}}>
            <div style={{padding:'10px 14px', borderBottom:'1px solid var(--gray-200)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <strong>{grupo.obra}</strong>
              <span style={{fontSize:12, color:'var(--gray-500)'}}>
                {grupo.items.length} trabajador{grupo.items.length !== 1 ? 'es' : ''} · {fmt(grupo.totalSueldo)}
              </span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>RUT</th>
                    <th>Nombre Completo</th>
                    <th>Cargo</th>
                    <th>CC</th>
                    <th>Fecha Ingreso</th>
                    <th>Tipo de Contrato</th>
                    <th>Sueldo Bruto</th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.items.map((c, i) => {
                    const cc = centrosCosto.find(x => x.id === c.id_centro_costo)
                    const cargo = cargos.find(x => x.id === c.id_cargo)
                    const tipo = tiposContrato.find(x => x.id === c.id_tipo_contrato)
                    return (
                      <tr key={c.id} style={{background: i % 2 === 1 ? 'var(--gray-50)' : 'transparent'}}>
                        <td style={{padding:'7px 14px', whiteSpace:'nowrap'}}>{c.empleado?.rut || '—'}</td>
                        <td className="text-muted" style={{padding:'7px 14px'}}>
                          {c.empleado ? `${c.empleado.nombres} ${c.empleado.apellido_paterno} ${c.empleado.apellido_materno || ''}`.trim() : `Trabajador #${c.id_empleado}`}
                        </td>
                        <td className="text-muted" style={{padding:'7px 14px'}}>{cargo?.nombre || '—'}</td>
                        <td className="text-muted" style={{padding:'7px 14px', whiteSpace:'nowrap'}} title={cc?.nombre || ''}>{cc?.codigo || '—'}</td>
                        <td className="text-muted" style={{padding:'7px 14px', whiteSpace:'nowrap'}}>{c.fecha_inicio}</td>
                        <td className="text-muted" style={{padding:'7px 14px'}}>{tipo?.nombre || '—'}</td>
                        <td style={{padding:'7px 14px'}}>{fmt(c.sueldo_bruto)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </>}
    </div>
  )
}
