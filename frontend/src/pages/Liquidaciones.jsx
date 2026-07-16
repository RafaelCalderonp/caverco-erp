import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { liquidacionesApi, empleadosApi } from '../services/api'

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
const estadoBadge = e => ({
  BORRADOR: 'badge-gray', EMITIDA: 'badge-blue', PAGADA: 'badge-green'
}[e] || 'badge-gray')

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
  const [periodoCerrado, setPeriodoCerrado] = useState(false)
  const [cambiandoCierre, setCambiandoCierre] = useState(false)

  // Formulario calcular
  const [form, setForm] = useState({
    id_empleado: '', dias_trabajados: 30,
    horas_extra_50: 0, horas_extra_100: 0, aguinaldo: 0,
    colacion: 0, movilizacion: 0, viaticos: 0,
    anticipo: 0, prestamo: 0, observacion: ''
  })
  const [preview, setPreview]   = useState(null)
  const [emitiendo, setEmitiendo] = useState(false)
  const [msg, setMsg]           = useState('')

  useEffect(() => {
    empleadosApi.list({ activo: true, limit: 200 }).then(r => setEmpleados(r.data)).catch(() => {})
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

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

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
        const headerRowStyle = {display:'flex',gap:20,alignItems:'center',flexWrap:'wrap',padding:'8px 16px',background:'var(--primary-bg)',fontSize:13}
        const Chip = ({label, value}) => (
          <span style={{color:'var(--gray-600)'}}>{label} <strong style={{color:'var(--text)'}}>{value}</strong></span>
        )
        return (
          <div style={{border:'1px solid #bfdbfe',borderRadius:'var(--radius)',marginBottom:16,overflow:'hidden',fontSize:13}}>

            {/* Fila 1: título + selector + UF UTM UTA Sueldo Mín Tope Gratif SIS + fuente + toggle */}
            <div style={{...headerRowStyle,cursor:'pointer',justifyContent:'space-between'}}
              onClick={e => { if (e.target.tagName !== 'SELECT') setIndicOpen(o => !o) }}>
              <div style={{display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <strong style={{fontSize:13}}>📊 Indicadores Previsionales</strong>
                  <select value={periodoIndicadores} onChange={e => { e.stopPropagation(); setPeriodoIndicadores(e.target.value) }}
                    style={{fontSize:13,border:'1px solid #bfdbfe',borderRadius:4,padding:'2px 6px',background:'var(--bg)',cursor:'pointer'}}>
                    {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <button title="Actualizar desde Gael Cloud" disabled={refrescando}
                    onClick={async e => { e.stopPropagation(); setRefrescando(true); try { const r = await liquidacionesApi.refrescarIndicadores(periodoIndicadores); setIndicadores(r.data.indicadores); setFuenteIndicadores(r.data.fuente); setAfpData(r.data.afp||[]); setAfcData(r.data.afc||[]); setTramosIU(r.data.tramos_impuesto_unico||[]) } catch{} finally { setRefrescando(false) } }}
                    style={{fontSize:12,border:'1px solid #bfdbfe',borderRadius:4,padding:'2px 8px',background:'var(--bg)',cursor:'pointer',color:'var(--primary)'}}>
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
            {indicOpen && (
              <div style={{background:'var(--bg)'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,padding:'16px'}}>
                  {afpData.length > 0 && (
                    <div>
                      <div style={{fontWeight:600,marginBottom:8,fontSize:12,color:'var(--gray-700)'}}>Tasas AFP — dependientes</div>
                      <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
                        <thead><tr>{thL('AFP')}{th('Trabajador')}{th('Aporte Emp.')}{th('Total')}</tr></thead>
                        <tbody>
                          {afpData.map(a => (
                            <tr key={a.nombre} style={{borderTop:'1px solid var(--gray-100)'}}>
                              {tdL(a.nombre, true)}
                              {td(pct(a.tasa))}
                              {td(pct(indicadores.aporte_empleador_afp))}
                              {td(pct(a.tasa + indicadores.aporte_empleador_afp), true)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p style={{fontSize:11,color:'var(--gray-500)',marginTop:4}}>SIS ({pct(indicadores.sis)}) se suma al costo total del empleador pero no a la tabla.</p>
                    </div>
                  )}
                  {afcData.length > 0 && (
                    <div>
                      <div style={{fontWeight:600,marginBottom:8,fontSize:12,color:'var(--gray-700)'}}>Seguro de Cesantía (AFC)</div>
                      <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
                        <thead><tr>{thL('Tipo Contrato')}{th('Empleador')}{th('Trabajador')}</tr></thead>
                        <tbody>
                          {afcData.map(tc => (
                            <tr key={tc.codigo} style={{borderTop:'1px solid var(--gray-100)'}}>
                              {tdL(tc.nombre)}
                              {td(pct(tc.empleador,1))}
                              {td(tc.trabajador > 0 ? pct(tc.trabajador,1) : '—')}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                {tramosIU.length > 0 && (
                  <div style={{padding:'0 16px 16px'}}>
                    <div style={{fontWeight:600,marginBottom:8,fontSize:12,color:'var(--gray-700)'}}>Tramos Impuesto Único — Renta Líquida Imponible mensual</div>
                    <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
                      <thead><tr>{thL('Tramo')}{th('Desde (CLP)')}{th('Hasta (CLP)')}{th('Factor')}{th('Rebaja (CLP)')}</tr></thead>
                      <tbody>
                        {tramosIU.map((t,i) => (
                          <tr key={i} style={{borderTop:'1px solid var(--gray-100)'}}>
                            {tdL(i+1)}
                            {td(`$${Number(t.desde).toLocaleString('es-CL',{minimumFractionDigits:2,maximumFractionDigits:2})}`)}
                            {td(t.hasta != null ? `$${Number(t.hasta).toLocaleString('es-CL',{minimumFractionDigits:2,maximumFractionDigits:2})}` : 'y más')}
                            {td(`${(t.factor*100 % 1 === 0 ? (t.factor*100).toFixed(0) : (t.factor*100).toFixed(1))}%`)}
                            {td(`$${Number(t.monto_rebaja).toLocaleString('es-CL',{minimumFractionDigits:2,maximumFractionDigits:2})}`)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}

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
                    Sin liquidaciones para {periodo}. <button className="btn btn-primary btn-sm" style={{marginLeft:8}} onClick={()=>setTab('calcular')}>Crear primera</button>
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

      {/* ── Formulario calcular ── */}
      {tab === 'calcular' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div className="card">
            <h3 style={{marginBottom:16,fontWeight:600}}>Datos del Mes</h3>
            {msg && <div style={{padding:'10px 14px',borderRadius:6,marginBottom:12,
              background: msg.startsWith('✅')?'#dcfce7':'#fee2e2',
              color: msg.startsWith('✅')?'#15803d':'#b91c1c'}}>{msg}</div>}

            <div className="form-group">
              <label className="form-label">Empleado</label>
              <select className="select" value={form.id_empleado} onChange={e=>set('id_empleado',e.target.value)}>
                <option value="">Seleccionar…</option>
                {empleados.map(e=>(
                  <option key={e.id} value={e.id}>{e.nombres} {e.apellido_paterno} — {e.rut}</option>
                ))}
              </select>
            </div>

            <div className="form-grid">
              {[
                ['dias_trabajados','Días Trabajados','number'],
                ['horas_extra_50','Horas Extra 50% (CLP)','number'],
                ['horas_extra_100','Horas Extra 100% (CLP)','number'],
                ['aguinaldo','Aguinaldo','number'],
                ['colacion','Colación','number'],
                ['movilizacion','Movilización','number'],
                ['viaticos','Viáticos','number'],
                ['anticipo','Anticipo','number'],
                ['prestamo','Préstamo','number'],
              ].map(([k,label,type])=>(
                <div key={k} className="form-group">
                  <label className="form-label">{label}</label>
                  <input className="input" type={type} value={form[k]}
                    onChange={e=>set(k, type==='number'?Number(e.target.value):e.target.value)} />
                </div>
              ))}
              <div className="form-group span2">
                <label className="form-label">Observación</label>
                <input className="input" value={form.observacion} onChange={e=>set('observacion',e.target.value)} />
              </div>
            </div>

            <button className="btn btn-primary" onClick={calcular}>Calcular</button>
          </div>

          {/* Preview resultado */}
          {preview && (
            <div className="card">
              <h3 style={{marginBottom:4,fontWeight:600}}>
                {preview.empleado.nombre}
              </h3>
              <p style={{fontSize:12,color:'var(--gray-500)',marginBottom:16}}>
                {preview.empleado.rut} · Período {preview.periodo}
              </p>

              <Section title="Haberes Imponibles">
                <Row label="Sueldo Base"       v={preview.haberes.sueldo_base} />
                <Row label="Gratificación"     v={preview.haberes.gratificacion} />
                {preview.haberes.horas_extra_50>0  && <Row label="HH.EE 50%"  v={preview.haberes.horas_extra_50} />}
                {preview.haberes.horas_extra_100>0 && <Row label="HH.EE 100%" v={preview.haberes.horas_extra_100} />}
                {preview.haberes.aguinaldo>0        && <Row label="Aguinaldo"  v={preview.haberes.aguinaldo} />}
                <Row label="Total Imponible" v={preview.haberes.total_imponible} bold />
              </Section>

              <Section title="Haberes No Imponibles">
                {preview.haberes.colacion>0      && <Row label="Colación"     v={preview.haberes.colacion} />}
                {preview.haberes.movilizacion>0  && <Row label="Movilización" v={preview.haberes.movilizacion} />}
                {preview.haberes.viaticos>0      && <Row label="Viáticos"     v={preview.haberes.viaticos} />}
                <Row label="Total Haberes" v={preview.haberes.total_haberes} bold />
              </Section>

              <Section title="Descuentos Legales" red>
                <Row label={`AFP (${(preview.indicadores.tasa_afp*100).toFixed(2)}%)`} v={preview.descuentos_legales.afp} red />
                <Row label="Salud (7%)"                  v={preview.descuentos_legales.salud} red />
                {preview.descuentos_legales.adicional_salud>0 && <Row label="Adic. Salud Isapre" v={preview.descuentos_legales.adicional_salud} red />}
                {preview.descuentos_legales.seguro_cesantia>0 && <Row label="AFC Trabajador"     v={preview.descuentos_legales.seguro_cesantia} red />}
                <Row label="Base Tributaria"             v={preview.descuentos_legales.base_tributaria} />
                <Row label="Impuesto Único"              v={preview.descuentos_legales.impuesto_unico} red />
                <Row label="Total Descuentos"            v={preview.descuentos_legales.total} bold red />
              </Section>

              {(preview.otros_descuentos.total>0) && (
                <Section title="Otros Descuentos">
                  {preview.otros_descuentos.anticipo>0 && <Row label="Anticipo" v={preview.otros_descuentos.anticipo} red />}
                  {preview.otros_descuentos.prestamo>0 && <Row label="Préstamo" v={preview.otros_descuentos.prestamo} red />}
                  <Row label="Total" v={preview.otros_descuentos.total} bold red />
                </Section>
              )}

              <div style={{background:'var(--primary)',color:'#fff',borderRadius:'var(--radius)',padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
                <span style={{fontWeight:600}}>LÍQUIDO A PAGAR</span>
                <span style={{fontSize:20,fontWeight:700}}>{fmt(preview.resultado.liquido_a_pagar)}</span>
              </div>

              <Section title="Aportes Patronales (cargo empresa)">
                <Row label="AFC Empleador (3%)"      v={preview.costos_empleador.afc_empleador} />
                <Row label="SIS (2.49%)"              v={preview.costos_empleador.sis} />
                <Row label="Aporte AFP (0.1%)"        v={preview.costos_empleador.aporte_empleador_afp} />
                <Row label="Seguro Social (0.9%)"     v={preview.costos_empleador.seguro_social} />
                <Row label="Total Costo Patronal"     v={preview.costos_empleador.total} bold />
              </Section>

              <button className="btn btn-primary" style={{marginTop:16,width:'100%'}}
                onClick={emitir} disabled={emitiendo}>
                {emitiendo ? 'Emitiendo…' : '✅ Emitir Liquidación'}
              </button>
            </div>
          )}
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
