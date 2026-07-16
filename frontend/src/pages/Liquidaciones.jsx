import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { liquidacionesApi, empleadosApi, catalogosApi } from '../services/api'

const PERIODOS = (() => {
  const arr = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    arr.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
  }
  return arr
})()

const fmt = n => n != null ? `$${Number(n).toLocaleString('es-CL')}` : '—'
const fmt2 = n => { const [int, dec] = Number(n).toFixed(2).split('.'); return `$${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}` }
const estadoBadge = e => ({
  BORRADOR: 'badge-gray', EMITIDA: 'badge-blue', PAGADA: 'badge-green'
}[e] || 'badge-gray')

// Ciclo de estados al hacer clic: VERDE → ROJO → AUSENTE → VERDE
const CICLO = { VERDE: 'ROJO', ROJO: 'AUSENTE', AUSENTE: 'VERDE' }
const TICK = {
  VERDE:   { icon: '✔', color: '#16a34a', bg: '#dcfce7' },
  ROJO:    { icon: '✔', color: '#dc2626', bg: '#fee2e2' },
  AUSENTE: { icon: '✖', color: '#dc2626', bg: '#fee2e2' },
}

// Nombres de mes abreviados en español
const MES_CORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function RegistroAsistencia({ periodo, centrosCosto, centroCostoId, setCentroCostoId,
  asistOpen, setAsistOpen, asistData, setAsistData, asistLoading, setAsistLoading }) {

  const [localData, setLocalData] = useState(null)
  const [savedData, setSavedData] = useState(null)   // snapshot para cancelar
  const [editMode, setEditMode]   = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [guardadoOk, setGuardadoOk] = useState(false)

  const cargar = async (ccId) => {
    setAsistLoading(true); setEditMode(false)
    try {
      const r = await liquidacionesApi.getAsistencia(periodo, ccId || undefined)
      setAsistData(r.data)
      const copia = r.data.empleados.map(e => ({ ...e, asistencia: [...e.asistencia] }))
      setLocalData(copia); setSavedData(copia)
    } catch { setAsistData(null); setLocalData(null) }
    finally { setAsistLoading(false) }
  }

  useEffect(() => { if (asistOpen) cargar(centroCostoId) }, [periodo, centroCostoId, asistOpen])

  const toggleCelda = (empIdx, diaIdx) => {
    if (!editMode || !localData) return
    setLocalData(prev => prev.map((e, i) => i === empIdx
      ? { ...e, asistencia: e.asistencia.map((s, j) => j === diaIdx ? CICLO[s] : s) }
      : e
    ))
  }

  const cancelar = () => {
    setLocalData(savedData.map(e => ({ ...e, asistencia: [...e.asistencia] })))
    setEditMode(false)
  }

  const guardar = async () => {
    if (!localData) return
    setGuardando(true)
    const celdas = []
    localData.forEach(emp => {
      emp.asistencia.forEach((estado, i) => {
        const prev = savedData.find(e => e.id === emp.id)
        if (!prev || prev.asistencia[i] !== estado)
          celdas.push({ id_empleado: emp.id, dia: i + 1, estado })
      })
    })
    try {
      if (celdas.length) await liquidacionesApi.guardarAsistencia(periodo, celdas)
      setSavedData(localData.map(e => ({ ...e, asistencia: [...e.asistencia] })))
      setEditMode(false); setGuardadoOk(true)
      setTimeout(() => setGuardadoOk(false), 2000)
    } catch { alert('Error al guardar') }
    finally { setGuardando(false) }
  }

  const [year, month] = periodo.split('-').map(Number)

  const hdrBtn = (label, onClick, danger) => (
    <button onClick={e => { e.stopPropagation(); onClick() }}
      style={{fontSize:11,padding:'3px 10px',borderRadius:4,border:'1px solid',cursor:'pointer',
        background: danger ? '#fee2e2' : '#fff', color: danger ? '#dc2626' : '#1e293b',
        borderColor: danger ? '#fca5a5' : '#94a3b8'}}>
      {label}
    </button>
  )

  return (
    <div style={{border:'1px solid #cbd5e1',borderRadius:'var(--radius)',marginBottom:16,overflow:'hidden',fontSize:12}}>
      <div style={{background:'#475569',color:'#fff',padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',fontSize:13}}
        onClick={e => { if (['SELECT','BUTTON'].includes(e.target.tagName)) return; const next = !asistOpen; setAsistOpen(next); if (next && !localData) cargar(centroCostoId) }}>
        <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <strong style={{fontSize:13}}>📋 Registro de Asistencia</strong>
          <select value={centroCostoId} onClick={e => e.stopPropagation()}
            onChange={e => { e.stopPropagation(); setCentroCostoId(e.target.value) }}
            style={{fontSize:12,border:'1px solid #94a3b8',borderRadius:4,padding:'2px 8px',background:'#fff',color:'#1e293b',cursor:'pointer'}}>
            <option value="">— Todos los trabajadores —</option>
            {centrosCosto.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          {asistOpen && !editMode && hdrBtn('✏️ Editar', () => setEditMode(true))}
          {asistOpen && editMode && <>
            {hdrBtn(guardando ? 'Guardando…' : '💾 Guardar', guardar)}
            {hdrBtn('✖ Cancelar', cancelar, true)}
          </>}
          {guardadoOk && <span style={{fontSize:11,color:'#86efac'}}>✔ Guardado</span>}
        </div>
        <span style={{fontSize:11,color:'#e2e8f0'}}>{asistOpen ? '▲' : '▼'}</span>
      </div>

      {asistOpen && (
        <div style={{background:'var(--bg)'}}>
          {editMode && <div style={{padding:'6px 12px',background:'#fefce8',borderBottom:'1px solid #fde68a',fontSize:11,color:'#92400e'}}>
            ✏️ Modo edición activo — haz clic en las celdas para cambiar el estado, luego guarda.
          </div>}
          <div style={{overflowX:'auto'}}>
            {asistLoading && <p style={{padding:16,color:'var(--gray-500)'}}>Cargando…</p>}
            {!asistLoading && localData?.length === 0 && <p style={{padding:16,color:'var(--gray-500)'}}>No hay trabajadores para este filtro.</p>}
            {!asistLoading && localData?.length > 0 && asistData && (
              <table style={{borderCollapse:'collapse',minWidth:'100%',fontSize:11}}>
                <thead>
                  <tr>
                    <th style={{position:'sticky',left:0,zIndex:2,background:'#f8fafc',padding:'6px 12px',textAlign:'left',borderBottom:'1px solid #e2e8f0',minWidth:170,fontWeight:600,fontSize:12}}>Trabajador</th>
                    {Array.from({length: asistData.dias}, (_,i) => {
                      const d = new Date(year, month-1, i+1)
                      const inhabil = asistData.tipo_dia[i] === 'INHABIL'
                      return <th key={i} style={{padding:'4px 3px',textAlign:'center',minWidth:32,
                        background: inhabil ? '#fef2f2' : '#f8fafc',borderBottom:'1px solid #e2e8f0',
                        borderLeft: d.getDay()===1 ? '2px solid #cbd5e1' : '1px solid #f1f5f9',
                        color: inhabil ? '#dc2626' : '#475569',fontWeight:600}}>
                        <div>{String(i+1).padStart(2,'0')}</div>
                        <div style={{fontSize:9,fontWeight:400}}>{['dom','lun','mar','mié','jue','vie','sáb'][d.getDay()]}</div>
                      </th>
                    })}
                  </tr>
                </thead>
                <tbody>
                  {localData.map((emp, empIdx) => (
                    <tr key={emp.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                      <td style={{position:'sticky',left:0,zIndex:1,background:'var(--bg)',padding:'4px 12px',fontWeight:500,whiteSpace:'nowrap',borderRight:'1px solid #e2e8f0'}}>{emp.nombre}</td>
                      {emp.asistencia.map((estado, diaIdx) => {
                        const s = TICK[estado] || TICK.VERDE
                        const changed = savedData && savedData[empIdx]?.asistencia[diaIdx] !== estado
                        return <td key={diaIdx} onClick={() => toggleCelda(empIdx, diaIdx)}
                          style={{textAlign:'center',cursor: editMode ? 'pointer' : 'default',padding:'3px 2px',
                            borderLeft:'1px solid #f1f5f9',
                            background: asistData.tipo_dia[diaIdx]==='INHABIL' ? '#fff8f8' : 'transparent'}}>
                          <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',
                            width:22,height:22,borderRadius:4,background:s.bg,color:s.color,fontSize:12,fontWeight:700,
                            border:`${changed?2:1}px solid ${changed?s.color:s.color+'40'}`
                          }}>{s.icon}</span>
                        </td>
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div style={{display:'flex',gap:16,padding:'8px 12px',fontSize:11,color:'var(--gray-500)',borderTop:'1px solid #f1f5f9'}}>
            <span><span style={{color:'#16a34a',fontWeight:700}}>✔</span> Presente hábil</span>
            <span><span style={{color:'#dc2626',fontWeight:700}}>✔</span> Presente feriado/fin de semana</span>
            <span><span style={{color:'#dc2626',fontWeight:700}}>✖</span> Ausente</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Liquidaciones() {
  const [tab, setTab]         = useState('lista')        // 'lista' | 'calcular'
  const [periodo, setPeriodo] = useState(PERIODOS[0])
  const [lista, setLista]     = useState([])
  const [loading, setLoading] = useState(false)
  const [empleados, setEmpleados] = useState([])
  const [periodoIndicadores, setPeriodoIndicadores] = useState(PERIODOS[0])
  const [indicadores, setIndicadores] = useState(null)
  const [fuenteIndicadores, setFuenteIndicadores] = useState(null)
  const [afpData, setAfpData] = useState([])
  const [afcData, setAfcData] = useState([])
  const [tramosIU, setTramosIU] = useState([])
  const [indicOpen, setIndicOpen] = useState(false)
  const [refrescando, setRefrescando] = useState(false)

  // Registro de Asistencia
  const [asistOpen, setAsistOpen] = useState(false)
  const [centrosCosto, setCentrosCosto] = useState([])
  const [centroCostoId, setCentroCostoId] = useState('')
  const [asistData, setAsistData] = useState(null)   // { dias, tipo_dia, empleados }
  const [asistLoading, setAsistLoading] = useState(false)
  const pendingRef = useRef({})
  const [periodoCerrado, setPeriodoCerrado] = useState(false)
  const [cambiandoCierre, setCambiandoCierre] = useState(false)

  // Calcular tab — CC flow
  const [calcCC, setCalcCC]         = useState('')
  const [calcData, setCalcData]     = useState(null)
  const [calcLoading, setCalcLoading] = useState(false)
  const [empleadoForms, setEmpleadoForms] = useState({})
  const [calcPreviews, setCalcPreviews]   = useState({})
  const [calcMsg, setCalcMsg]       = useState('')
  const [emitiendo, setEmitiendo]   = useState({})

  useEffect(() => {
    empleadosApi.list({ activo: true, limit: 200 }).then(r => setEmpleados(r.data)).catch(() => {})
    catalogosApi.centrosCosto().then(r => setCentrosCosto(r.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (tab !== 'lista') return
    setLoading(true)
    liquidacionesApi.listarPeriodo(periodo)
      .then(r => setLista(r.data))
      .catch(() => setLista([]))
      .finally(() => setLoading(false))
  }, [periodo, tab])

  useEffect(() => {
    liquidacionesApi.indicadores(periodoIndicadores)
      .then(r => {
        setIndicadores(r.data.indicadores)
        setFuenteIndicadores(r.data.fuente)
        setAfpData(r.data.afp || [])
        setAfcData(r.data.afc || [])
        setTramosIU(r.data.tramos_impuesto_unico || [])
      })
      .catch(() => { setIndicadores(null); setFuenteIndicadores(null) })
  }, [periodoIndicadores])

  useEffect(() => {
    liquidacionesApi.indicadores(periodo)
      .then(r => setPeriodoCerrado(!!r.data.cerrado))
      .catch(() => setPeriodoCerrado(false))
  }, [periodo])

  const toggleCierre = async () => {
    setCambiandoCierre(true); setMsg('')
    try {
      if (periodoCerrado) {
        await liquidacionesApi.reabrirPeriodo(periodo)
        setPeriodoCerrado(false)
      } else {
        await liquidacionesApi.cerrarPeriodo(periodo)
        setPeriodoCerrado(true)
      }
    } catch (e) {
      setMsg(e.response?.data?.detail || 'Error al cambiar el estado del período')
    } finally { setCambiandoCierre(false) }
  }

  const cargarCalcData = async () => {
    if (!calcCC) return
    setCalcLoading(true); setCalcMsg(''); setCalcData(null); setCalcPreviews({})
    try {
      const r = await liquidacionesApi.getAsistencia(periodo, calcCC)
      setCalcData(r.data)
      const forms = {}
      r.data.empleados.forEach(emp => {
        const ausenteCount = emp.asistencia.filter(s => s === 'AUSENTE').length
        forms[emp.id] = {
          expanded: false,
          dias_trabajados: 30 - ausenteCount,
          colacion: emp.colacion || 0,
          movilizacion: emp.movilizacion || 0,
          he_days: {},
          aguinaldo: 0, viaticos: 0, anticipo: 0, prestamo: 0, observacion: ''
        }
      })
      setEmpleadoForms(forms)
    } catch { setCalcMsg('Error al cargar empleados del CC') }
    finally { setCalcLoading(false) }
  }

  const setEF = (empId, patch) =>
    setEmpleadoForms(f => ({...f, [empId]: {...f[empId], ...patch}}))

  const setHeDia = (empId, dia, patch) =>
    setEmpleadoForms(f => {
      const ef = f[empId]
      return {...f, [empId]: {...ef, he_days: {...ef.he_days, [dia]: {...(ef.he_days[dia]||{h50:0,h100:0}), ...patch}}}}
    })

  const heClp = (empId, ef) => {
    const emp = calcData?.empleados.find(e => e.id === empId)
    const vh = (emp?.sueldo_base || 0) / 30 / 8
    const he50  = Object.values(ef.he_days).reduce((s,d) => s + Math.round((Number(d.h50 )||0) * vh * 1.5), 0)
    const he100 = Object.values(ef.he_days).reduce((s,d) => s + Math.round((Number(d.h100)||0) * vh * 2.0), 0)
    return { he50, he100 }
  }

  const calcularEmp = async (empId) => {
    const ef = empleadoForms[empId]; if (!ef) return
    const { he50: totalHe50, he100: totalHe100 } = heClp(empId, ef)
    setCalcMsg('')
    try {
      const r = await liquidacionesApi.calcular({
        periodo, id_empleado: empId,
        dias_trabajados: ef.dias_trabajados,
        horas_extra_50: totalHe50,
        horas_extra_100: totalHe100,
        aguinaldo: ef.aguinaldo,
        colacion: ef.colacion,
        movilizacion: ef.movilizacion,
        viaticos: ef.viaticos,
        anticipo: ef.anticipo,
        prestamo: ef.prestamo,
        observacion: ef.observacion,
      })
      setCalcPreviews(p => ({...p, [empId]: r.data}))
    } catch(e) { setCalcMsg(e.response?.data?.detail || 'Error al calcular') }
  }

  const emitirEmp = async (empId) => {
    const ef = empleadoForms[empId]; if (!ef) return
    const { he50: totalHe50, he100: totalHe100 } = heClp(empId, ef)
    setEmitiendo(e => ({...e, [empId]: true})); setCalcMsg('')
    try {
      await liquidacionesApi.emitir({
        periodo, id_empleado: empId,
        dias_trabajados: ef.dias_trabajados,
        horas_extra_50: totalHe50,
        horas_extra_100: totalHe100,
        aguinaldo: ef.aguinaldo,
        colacion: ef.colacion,
        movilizacion: ef.movilizacion,
        viaticos: ef.viaticos,
        anticipo: ef.anticipo,
        prestamo: ef.prestamo,
        observacion: ef.observacion,
      })
      setCalcPreviews(p => ({...p, [empId]: null}))
      setEF(empId, {expanded: false})
      setCalcMsg(`✅ Liquidación de ${calcData.empleados.find(e=>e.id===empId)?.nombre} emitida`)
    } catch(e) { setCalcMsg(e.response?.data?.detail || 'Error al emitir') }
    finally { setEmitiendo(e => ({...e, [empId]: false})) }
  }

  const descargar = async (fn, nombreDefault) => {
    try {
      const r = await fn(periodo, 1)
      const disposition = r.headers['content-disposition'] || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const nombre = match ? match[1] : nombreDefault
      const url = URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      a.href = url; a.download = nombre
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setMsg(e.response?.status === 404
        ? `No hay liquidaciones EMITIDAS para ${periodo}`
        : 'Error al generar el archivo')
    }
  }

  const calcular = async () => {
    if (!form.id_empleado) return setMsg('Selecciona un empleado')
    setMsg(''); setPreview(null)
    try {
      const r = await liquidacionesApi.calcular({ ...form, periodo,
        id_empleado: parseInt(form.id_empleado) })
      setPreview(r.data)
    } catch(e) {
      setMsg(e.response?.data?.detail || 'Error al calcular')
    }
  }

  const emitir = async () => {
    if (!preview) return
    setEmitiendo(true); setMsg('')
    try {
      await liquidacionesApi.emitir({ ...form, periodo,
        id_empleado: parseInt(form.id_empleado) })
      setMsg('✅ Liquidación emitida correctamente')
      setPreview(null)
      setTab('lista')
    } catch(e) {
      setMsg(e.response?.data?.detail || 'Error al emitir')
    } finally { setEmitiendo(false) }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Liquidaciones de Sueldo</h1>
        <div className="flex gap-2">
          <select className="select" style={{width:'auto'}} value={periodo}
            onChange={e => setPeriodo(e.target.value)}>
            {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button className={`btn ${tab==='lista'?'btn-primary':'btn-outline'}`}
            onClick={() => setTab('lista')}>📋 Lista</button>
          <button className={`btn ${tab==='calcular'?'btn-primary':'btn-outline'}`}
            onClick={() => setTab('calcular')}>➕ Nueva</button>
          <button className="btn btn-outline"
            onClick={() => descargar(liquidacionesApi.exportarPrevired, `previred_${periodo}.csv`)}>
            ⬇️ Archivo Previred
          </button>
          <button className="btn btn-outline"
            onClick={() => descargar(liquidacionesApi.exportarLibroRemuneraciones, `libro_remuneraciones_${periodo}.csv`)}>
            ⬇️ Libro Remuneraciones DT
          </button>
          <button className={`btn ${periodoCerrado ? 'btn-outline' : 'btn-danger'}`}
            onClick={toggleCierre} disabled={cambiandoCierre}>
            {cambiandoCierre ? '…' : periodoCerrado ? '🔓 Reabrir Período' : '🔒 Cerrar Período'}
          </button>
        </div>
      </div>
      {periodoCerrado && (
        <p style={{fontSize:12,color:'var(--danger)',marginTop:-8,marginBottom:16}}>
          Este período está cerrado: no se pueden emitir ni pagar liquidaciones para {periodo}.
        </p>
      )}
      <p style={{fontSize:12,color:'var(--gray-500)',marginTop:-8,marginBottom:16}}>
        Estos archivos se generan a partir de las liquidaciones EMITIDAS del período. Súbelos manualmente en
        previred.com y en el portal Mi DT — la app no inicia sesión por ti.
      </p>

      {/* ── Indicadores Previsionales (colapsable) ── */}
      {indicadores && (() => {
        const clp = n => `$${Number(n||0).toLocaleString('es-CL')}`
        const pct = (n,d=2) => `${((n||0)*100).toFixed(d)}%`
        const th = txt => <th style={{textAlign:'right',color:'var(--gray-500)',fontWeight:500,paddingBottom:6,fontSize:11}}>{txt}</th>
        const thL = txt => <th style={{textAlign:'left',color:'var(--gray-500)',fontWeight:500,paddingBottom:6,fontSize:11}}>{txt}</th>
        const td = (v,bold) => <td style={{textAlign:'right',fontWeight:bold?600:400,paddingTop:3}}>{v}</td>
        const tdL = (v,bold) => <td style={{paddingTop:3,fontWeight:bold?600:400}}>{v}</td>
        const headerRowStyle = {display:'flex',gap:20,alignItems:'center',flexWrap:'wrap',padding:'8px 16px',background:'#f8fafc',fontSize:13}
        const Chip = ({label, value}) => (
          <span style={{color:'var(--gray-600)'}}>{label} <strong style={{color:'var(--text)'}}>{value}</strong></span>
        )
        return (
          <div style={{border:'1px solid #cbd5e1',borderRadius:'var(--radius)',marginBottom:16,overflow:'hidden',fontSize:13}}>

            {/* Fila 1: título + selector + UF UTM UTA Sueldo Mín Tope Gratif SIS + fuente + toggle */}
            <div style={{...headerRowStyle,cursor:'pointer',justifyContent:'space-between'}}
              onClick={e => { if (e.target.tagName !== 'SELECT') setIndicOpen(o => !o) }}>
              <div style={{display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <strong style={{fontSize:13}}>📊 Indicadores Previsionales</strong>
                  <select value={periodoIndicadores} onChange={e => { e.stopPropagation(); setPeriodoIndicadores(e.target.value) }}
                    style={{fontSize:13,border:'1px solid #cbd5e1',borderRadius:4,padding:'2px 6px',background:'var(--bg)',cursor:'pointer'}}>
                    {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <button title="Actualizar desde Gael Cloud" disabled={refrescando}
                    onClick={async e => { e.stopPropagation(); setRefrescando(true); try { const r = await liquidacionesApi.refrescarIndicadores(periodoIndicadores); setIndicadores(r.data.indicadores); setFuenteIndicadores(r.data.fuente); setAfpData(r.data.afp||[]); setAfcData(r.data.afc||[]); setTramosIU(r.data.tramos_impuesto_unico||[]) } catch{} finally { setRefrescando(false) } }}
                    style={{fontSize:12,border:'1px solid #cbd5e1',borderRadius:4,padding:'2px 8px',background:'var(--bg)',cursor:'pointer',color:'var(--primary)'}}>
                    {refrescando ? '…' : '🔄'}
                  </button>
                </div>
                <Chip label="UF" value={`$${Number(indicadores.uf||0).toLocaleString('es-CL',{minimumFractionDigits:2})}`} />
                <Chip label="UTM" value={clp(indicadores.utm)} />
                <Chip label="UTA" value={clp(indicadores.uta)} />
                <Chip label="Sueldo Mín." value={clp(indicadores.sueldo_minimo)} />
                <Chip label="Tope Gratif." value={clp(indicadores.tope_gratif)} />
                <Chip label="SIS" value={pct(indicadores.sis)} />
              </div>
              <span style={{fontSize:11,color:'var(--gray-500)',whiteSpace:'nowrap',marginLeft:12}}>
                {fuenteIndicadores === 'API_GATEWAY' ? '🟢 Gael Cloud' : fuenteIndicadores === 'MANUAL' ? '🔵 Manual' : '🟡 Respaldo'}
                {' '}{indicOpen ? '▲' : '▼'}
              </span>
            </div>

            {/* Fila 2: topes y aportes — siempre visible, mismo estilo */}
            <div style={{...headerRowStyle,borderTop:'1px solid #bfdbfe',cursor:'pointer'}}
              onClick={() => setIndicOpen(o => !o)}>
              <Chip label="Tope Imponible AFP (90 UF)" value={clp(indicadores.renta_tope_afp)} />
              <Chip label="Tope Imponible AFC (135.2 UF)" value={clp(indicadores.renta_tope_afc)} />
              <Chip label="Aporte Empleador AFP" value={pct(indicadores.aporte_empleador_afp)} />
              <Chip label="Seguro Social" value={pct(indicadores.seguro_social,1)} />
            </div>

            {/* Contenido expandido: solo AFP, AFC, Tramos IU */}
            {indicOpen && (() => {
              const tblHeader = (title, cols) => (
                <thead>
                  <tr><th colSpan={cols} style={{background:'var(--primary)',color:'#fff',textAlign:'center',fontWeight:700,fontSize:12,padding:'7px 10px',letterSpacing:'0.05em'}}>{title}</th></tr>
                  <tr style={{background:'#f8fafc'}}>
                    {/* columnas inyectadas por cada tabla */}
                  </tr>
                </thead>
              )
              const tblStyle = {width:'100%',fontSize:12,borderCollapse:'collapse',border:'1px solid #cbd5e1',borderRadius:6,overflow:'hidden'}
              const thS = (txt, right) => <th style={{padding:'5px 10px',textAlign:right?'right':'left',color:'var(--gray-600)',fontWeight:600,fontSize:11,background:'#f8fafc',borderBottom:'1px solid #cbd5e1'}}>{txt}</th>
              const tdS = (v, right, bold) => <td style={{padding:'5px 10px',textAlign:right?'right':'left',fontWeight:bold?600:400,borderTop:'1px solid #e0e7ff'}}>{v}</td>
              const TableTitle = ({title}) => (
                <tr><td colSpan={99} style={{background:'#475569',color:'#fff',textAlign:'center',fontWeight:700,fontSize:12,padding:'7px 10px',letterSpacing:'0.05em',textTransform:'uppercase'}}>{title}</td></tr>
              )
              return (
                <div style={{background:'var(--bg)',padding:'16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                  {afpData.length > 0 && (
                    <div style={{overflow:'hidden',borderRadius:6,border:'1px solid #cbd5e1'}}>
                      <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
                        <thead>
                          <TableTitle title="Tasas AFP — Trabajadores Dependientes" />
                          <tr style={{background:'#f8fafc'}}>
                            {thS('AFP')} {thS('Trabajador',true)} {thS('Aporte Emp.',true)} {thS('Total',true)}
                          </tr>
                        </thead>
                        <tbody>
                          {afpData.map(a => (
                            <tr key={a.nombre}>
                              {tdS(a.nombre,false,true)}
                              {tdS(pct(a.tasa),true)}
                              {tdS(pct(indicadores.aporte_empleador_afp),true)}
                              {tdS(pct(a.tasa + indicadores.aporte_empleador_afp),true,true)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {afcData.length > 0 && (
                    <div style={{overflow:'hidden',borderRadius:6,border:'1px solid #cbd5e1'}}>
                      <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
                        <thead>
                          <TableTitle title="Seguro de Cesantía (AFC)" />
                          <tr style={{background:'#f8fafc'}}>
                            {thS('Tipo Contrato')} {thS('Empleador',true)} {thS('Trabajador',true)}
                          </tr>
                        </thead>
                        <tbody>
                          {afcData.map(tc => (
                            <tr key={tc.codigo}>
                              {tdS(tc.nombre,false,true)}
                              {tdS(pct(tc.empleador,1),true)}
                              {tdS(tc.trabajador > 0 ? pct(tc.trabajador,1) : '—',true)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {tramosIU.length > 0 && (
                    <div style={{overflow:'hidden',borderRadius:6,border:'1px solid #cbd5e1',gridColumn:'1 / -1'}}>
                      <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
                        <thead>
                          <TableTitle title="Tramos Impuesto Único — Renta Líquida Imponible mensual" />
                          <tr style={{background:'#f8fafc'}}>
                            {thS('Tramo')} {thS('Desde (CLP)',true)} {thS('Hasta (CLP)',true)} {thS('Factor',true)} {thS('Rebaja (CLP)',true)}
                          </tr>
                        </thead>
                        <tbody>
                          {tramosIU.map((t,i) => (
                            <tr key={i}>
                              {tdS(i+1,false,true)}
                              {tdS(fmt2(t.desde),true)}
                              {tdS(t.hasta != null ? fmt2(t.hasta) : 'y más',true)}
                              {tdS(`${(t.factor*100 % 1 === 0 ? (t.factor*100).toFixed(0) : (t.factor*100).toFixed(1))}%`,true)}
                              {tdS(fmt2(t.monto_rebaja),true)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )
      })()}

      {/* ── Registro de Asistencia ── */}
      <RegistroAsistencia
        periodo={periodo}
        centrosCosto={centrosCosto}
        centroCostoId={centroCostoId}
        setCentroCostoId={setCentroCostoId}
        asistOpen={asistOpen}
        setAsistOpen={setAsistOpen}
        asistData={asistData}
        setAsistData={setAsistData}
        asistLoading={asistLoading}
        setAsistLoading={setAsistLoading}
        pendingRef={pendingRef}
      />

      {/* ── Lista período ── */}
      {tab === 'lista' && (
        <div className="card" style={{padding:0}}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Empleado</th><th>Período</th><th>Total Imponible</th>
                  <th>Total Haberes</th><th>Desc. Legales</th>
                  <th>Líquido a Pagar</th><th>Estado</th><th></th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={8} style={{textAlign:'center',padding:28,color:'var(--gray-500)'}}>Cargando…</td></tr>}
                {!loading && lista.length === 0 && (
                  <tr><td colSpan={8} style={{textAlign:'center',padding:28,color:'var(--gray-500)'}}>
                    Sin liquidaciones para {periodo}. <button className="btn btn-primary btn-sm" style={{marginLeft:8}} onClick={()=>setTab('calcular')}>Crear liquidaciones</button>
                  </td></tr>
                )}
                {lista.map(l => (
                  <tr key={l.id}>
                    <td>Empleado #{l.id_empleado}</td>
                    <td>{l.periodo}</td>
                    <td style={{textAlign:'right'}}>{fmt(l.total_imponible)}</td>
                    <td style={{textAlign:'right'}}>{fmt(l.total_haberes)}</td>
                    <td style={{textAlign:'right',color:'var(--danger)'}}>{fmt(l.total_desc_legales)}</td>
                    <td style={{textAlign:'right',fontWeight:700}}>{fmt(l.liquido_a_pagar)}</td>
                    <td><span className={`badge ${estadoBadge(l.estado)}`}>{l.estado}</span></td>
                    <td>
                      <Link to={`/liquidaciones/${l.id}`} className="btn btn-outline btn-sm">Ver</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Crear liquidaciones por CC ── */}
      {tab === 'calcular' && (
        <div>
          {/* Selector CC */}
          <div className="card" style={{marginBottom:16,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap',padding:'14px 16px'}}>
            <strong style={{fontSize:14}}>Centro de Costo</strong>
            <select className="select" style={{width:'auto',minWidth:200}} value={calcCC}
              onChange={e => { setCalcCC(e.target.value); setCalcData(null) }}>
              <option value="">— Seleccionar CC —</option>
              {centrosCosto.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <button className="btn btn-primary" disabled={!calcCC || calcLoading} onClick={cargarCalcData}>
              {calcLoading ? 'Cargando…' : '📋 Crear Liquidaciones del CC'}
            </button>
          </div>

          {calcMsg && (
            <div style={{padding:'10px 14px',borderRadius:6,marginBottom:12,
              background: calcMsg.startsWith('✅') ? '#dcfce7' : '#fee2e2',
              color:      calcMsg.startsWith('✅') ? '#15803d' : '#b91c1c'}}>{calcMsg}</div>
          )}

          {calcData && calcData.empleados.length === 0 && (
            <p style={{color:'var(--gray-500)',padding:8}}>No hay trabajadores activos en este CC para {periodo}.</p>
          )}

          {calcData && calcData.empleados.map(emp => {
            const ef = empleadoForms[emp.id]
            if (!ef) return null
            // Días INHÁBIL que el trabajador marcó como VERDE = trabajó en feriado/fin de semana → HH.EE
            const rojoDias = emp.asistencia.map((s,i) => (calcData.tipo_dia[i] === 'INHABIL' && s === 'VERDE') ? i+1 : null).filter(Boolean)
            const rojoFaltanHE = rojoDias.some(d => {
              const hd = ef.he_days[d] || {h50:0,h100:0}
              return (Number(hd.h50)||0) === 0 && (Number(hd.h100)||0) === 0
            })
            const prev = calcPreviews[emp.id]
            const emitOk = !!prev

            return (
              <div key={emp.id} style={{border:'1px solid #cbd5e1',borderRadius:8,marginBottom:12,overflow:'hidden'}}>
                {/* Card header */}
                <div style={{background:'#f8fafc',padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}
                  onClick={() => setEF(emp.id, {expanded: !ef.expanded})}>
                  <div style={{display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
                    <strong style={{fontSize:14}}>{emp.nombre}</strong>
                    <span style={{fontSize:12,color:'var(--gray-500)'}}>Días trabajados: <strong>{ef.dias_trabajados}</strong></span>
                    {rojoDias.length > 0 && (
                      <span style={{fontSize:12,color:'#dc2626'}}>
                        ⚠️ {rojoDias.length} día{rojoDias.length>1?'s':''} festivo{rojoDias.length>1?'s':''} trabajado{rojoDias.length>1?'s':''}
                        {rojoFaltanHE ? ' — falta ingresar HH.EE' : ''}
                      </span>
                    )}
                    {emitOk && <span style={{fontSize:12,color:'#16a34a'}}>✔ Calculado: {fmt(prev.resultado.liquido_a_pagar)}</span>}
                  </div>
                  <span style={{fontSize:11,color:'var(--gray-500)'}}>{ef.expanded ? '▲' : '▼'}</span>
                </div>

                {ef.expanded && (
                  <div style={{padding:16,display:'grid',gridTemplateColumns: prev ? '1fr 1fr' : '1fr',gap:20}}>
                    {/* Formulario */}
                    <div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                        {[
                          ['dias_trabajados','Días Trabajados'],
                          ['colacion','Colación'],
                          ['movilizacion','Movilización'],
                          ['aguinaldo','Aguinaldo'],
                          ['viaticos','Viáticos'],
                          ['anticipo','Anticipo'],
                          ['prestamo','Préstamo'],
                        ].map(([k,label]) => (
                          <div key={k} className="form-group">
                            <label className="form-label">{label}</label>
                            <input className="input" type="number" value={ef[k]}
                              onChange={e => setEF(emp.id, {[k]: Number(e.target.value)})} />
                          </div>
                        ))}
                        <div className="form-group" style={{gridColumn:'1/-1'}}>
                          <label className="form-label">Observación</label>
                          <input className="input" value={ef.observacion}
                            onChange={e => setEF(emp.id, {observacion: e.target.value})} />
                        </div>
                      </div>

                      {rojoDias.length > 0 && (() => {
                        const valorHora = emp.sueldo_base / 30 / 8
                        const totalClp50  = Object.values(ef.he_days).reduce((s,d) => s + Math.round((Number(d.h50 )||0) * valorHora * 1.5), 0)
                        const totalClp100 = Object.values(ef.he_days).reduce((s,d) => s + Math.round((Number(d.h100)||0) * valorHora * 2.0), 0)
                        return (
                          <div style={{border:'1px solid #fca5a5',borderRadius:6,padding:12,background:'#fff8f8',marginBottom:12}}>
                            <div style={{fontWeight:600,fontSize:12,color:'#dc2626',marginBottom:4}}>
                              ⚠️ Días festivos/fines de semana trabajados — ingresa las horas extra
                            </div>
                            <div style={{fontSize:11,color:'var(--gray-500)',marginBottom:8}}>
                              Valor hora: {fmt(Math.round(valorHora))} · Valor hora 50%: {fmt(Math.round(valorHora*1.5))} · Valor hora 100%: {fmt(Math.round(valorHora*2))}
                            </div>
                            {rojoDias.map(dia => {
                              const d = new Date(Number(periodo.split('-')[0]), Number(periodo.split('-')[1])-1, dia)
                              const hd = ef.he_days[dia] || {h50:0, h100:0}
                              const clp50  = Math.round((Number(hd.h50 )||0) * valorHora * 1.5)
                              const clp100 = Math.round((Number(hd.h100)||0) * valorHora * 2.0)
                              return (
                                <div key={dia} style={{display:'grid',gridTemplateColumns:'80px 1fr 1fr',gap:8,alignItems:'center',marginBottom:6}}>
                                  <span style={{fontSize:12,fontWeight:500}}>
                                    {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()]} {dia}
                                  </span>
                                  <div style={{display:'flex',gap:4,alignItems:'center'}}>
                                    <label style={{fontSize:11,color:'var(--gray-500)',whiteSpace:'nowrap'}}>HH.EE 50%</label>
                                    <input type="number" min="0" step="0.5"
                                      style={{width:56,padding:'3px 6px',border:'1px solid #fca5a5',borderRadius:4,fontSize:12}}
                                      value={hd.h50} onChange={e => setHeDia(emp.id, dia, {h50: e.target.value})} />
                                    <span style={{fontSize:11,color:'#dc2626',whiteSpace:'nowrap'}}>{clp50>0 ? fmt(clp50) : ''}</span>
                                  </div>
                                  <div style={{display:'flex',gap:4,alignItems:'center'}}>
                                    <label style={{fontSize:11,color:'var(--gray-500)',whiteSpace:'nowrap'}}>HH.EE 100%</label>
                                    <input type="number" min="0" step="0.5"
                                      style={{width:56,padding:'3px 6px',border:'1px solid #fca5a5',borderRadius:4,fontSize:12}}
                                      value={hd.h100} onChange={e => setHeDia(emp.id, dia, {h100: e.target.value})} />
                                    <span style={{fontSize:11,color:'#dc2626',whiteSpace:'nowrap'}}>{clp100>0 ? fmt(clp100) : ''}</span>
                                  </div>
                                </div>
                              )
                            })}
                            <div style={{fontSize:11,color:'#b91c1c',marginTop:6,fontWeight:500}}>
                              Total HH.EE 50%: {fmt(totalClp50)} · Total HH.EE 100%: {fmt(totalClp100)}
                            </div>
                          </div>
                        )
                      })()}

                      <div style={{display:'flex',gap:8}}>
                        <button className="btn btn-primary" onClick={() => calcularEmp(emp.id)}>Calcular</button>
                        {emitOk && (
                          <button className="btn btn-primary" style={{background:'#16a34a',borderColor:'#16a34a'}}
                            onClick={() => emitirEmp(emp.id)} disabled={!!emitiendo[emp.id]}>
                            {emitiendo[emp.id] ? 'Emitiendo…' : '✅ Emitir Liquidación'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Preview resultado */}
                    {prev && (
                      <div>
                        <p style={{fontSize:12,color:'var(--gray-500)',marginBottom:12}}>{prev.empleado.rut} · Período {prev.periodo}</p>
                        <Section title="Haberes Imponibles">
                          <Row label="Sueldo Base"   v={prev.haberes.sueldo_base} />
                          <Row label="Gratificación" v={prev.haberes.gratificacion} />
                          {prev.haberes.horas_extra_50>0  && <Row label="HH.EE 50%"  v={prev.haberes.horas_extra_50} />}
                          {prev.haberes.horas_extra_100>0 && <Row label="HH.EE 100%" v={prev.haberes.horas_extra_100} />}
                          {prev.haberes.aguinaldo>0       && <Row label="Aguinaldo"  v={prev.haberes.aguinaldo} />}
                          <Row label="Total Imponible" v={prev.haberes.total_imponible} bold />
                        </Section>
                        <Section title="Haberes No Imponibles">
                          {prev.haberes.colacion>0     && <Row label="Colación"     v={prev.haberes.colacion} />}
                          {prev.haberes.movilizacion>0 && <Row label="Movilización" v={prev.haberes.movilizacion} />}
                          {prev.haberes.viaticos>0     && <Row label="Viáticos"     v={prev.haberes.viaticos} />}
                          <Row label="Total Haberes" v={prev.haberes.total_haberes} bold />
                        </Section>
                        <Section title="Descuentos Legales" red>
                          <Row label={`AFP (${(prev.indicadores.tasa_afp*100).toFixed(2)}%)`} v={prev.descuentos_legales.afp} red />
                          <Row label="Salud (7%)"       v={prev.descuentos_legales.salud} red />
                          {prev.descuentos_legales.adicional_salud>0 && <Row label="Adic. Salud Isapre" v={prev.descuentos_legales.adicional_salud} red />}
                          {prev.descuentos_legales.seguro_cesantia>0 && <Row label="AFC Trabajador"     v={prev.descuentos_legales.seguro_cesantia} red />}
                          <Row label="Base Tributaria"  v={prev.descuentos_legales.base_tributaria} />
                          <Row label="Impuesto Único"   v={prev.descuentos_legales.impuesto_unico} red />
                          <Row label="Total Descuentos" v={prev.descuentos_legales.total} bold red />
                        </Section>
                        {prev.otros_descuentos.total>0 && (
                          <Section title="Otros Descuentos">
                            {prev.otros_descuentos.anticipo>0 && <Row label="Anticipo" v={prev.otros_descuentos.anticipo} red />}
                            {prev.otros_descuentos.prestamo>0 && <Row label="Préstamo" v={prev.otros_descuentos.prestamo} red />}
                            <Row label="Total" v={prev.otros_descuentos.total} bold red />
                          </Section>
                        )}
                        <div style={{background:'var(--primary)',color:'#fff',borderRadius:'var(--radius)',padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
                          <span style={{fontWeight:600}}>LÍQUIDO A PAGAR</span>
                          <span style={{fontSize:20,fontWeight:700}}>{fmt(prev.resultado.liquido_a_pagar)}</span>
                        </div>
                        <Section title="Aportes Patronales">
                          <Row label="AFC Empleador"    v={prev.costos_empleador.afc_empleador} />
                          <Row label="SIS"              v={prev.costos_empleador.sis} />
                          <Row label="Aporte AFP"       v={prev.costos_empleador.aporte_empleador_afp} />
                          <Row label="Seguro Social"    v={prev.costos_empleador.seguro_social} />
                          <Row label="Total Patronal"   v={prev.costos_empleador.total} bold />
                        </Section>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Section({title, children, red}) {
  return (
    <div style={{marginBottom:12}}>
      <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em',
        color: red ? 'var(--danger)' : 'var(--gray-500)', marginBottom:4}}>{title}</div>
      <div style={{background:'var(--gray-50)',borderRadius:6,padding:'8px 12px'}}>{children}</div>
    </div>
  )
}

function Row({label, v, bold, red}) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',padding:'3px 0',
      fontWeight: bold ? 700 : 400,
      color: red && v > 0 ? 'var(--danger)' : 'inherit',
      borderTop: bold ? '1px solid var(--gray-200)' : 'none',
      marginTop: bold ? 4 : 0
    }}>
      <span>{label}</span>
      <span>{red && v > 0 ? '-' : ''}{fmt(v)}</span>
    </div>
  )
}
