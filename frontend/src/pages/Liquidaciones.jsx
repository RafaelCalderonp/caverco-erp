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
  const [indicadores, setIndicadores] = useState(null)
  const [fuenteIndicadores, setFuenteIndicadores] = useState(null)
  const [afpData, setAfpData] = useState([])
  const [afcData, setAfcData] = useState([])
  const [tramosIU, setTramosIU] = useState([])
  const [indicOpen, setIndicOpen] = useState(false)
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
    liquidacionesApi.indicadores(periodo)
      .then(r => {
        setIndicadores(r.data.indicadores)
        setFuenteIndicadores(r.data.fuente)
        setAfpData(r.data.afp || [])
        setAfcData(r.data.afc || [])
        setTramosIU(r.data.tramos_impuesto_unico || [])
        setPeriodoCerrado(!!r.data.cerrado)
      })
      .catch(() => { setIndicadores(null); setFuenteIndicadores(null); setPeriodoCerrado(false) })
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
      {indicadores && (
        <div style={{border:'1px solid #bfdbfe',borderRadius:'var(--radius)',marginBottom:16,overflow:'hidden',fontSize:13}}>
          {/* Header siempre visible */}
          <button onClick={() => setIndicOpen(o => !o)} style={{width:'100%',background:'var(--primary-bg)',border:'none',padding:'10px 16px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',textAlign:'left'}}>
            <div style={{display:'flex',gap:24,alignItems:'center',flexWrap:'wrap'}}>
              <strong style={{fontSize:13}}>📊 Indicadores Previsionales — {periodo}</strong>
              <span>UF <strong>${Number(indicadores.uf||0).toLocaleString('es-CL',{minimumFractionDigits:2})}</strong></span>
              <span>UTM <strong>${Number(indicadores.utm||0).toLocaleString('es-CL')}</strong></span>
              <span>Sueldo Mín. <strong>${Number(indicadores.sueldo_minimo||0).toLocaleString('es-CL')}</strong></span>
              <span>Tope Gratif. <strong>${Number(indicadores.tope_gratif||0).toLocaleString('es-CL')}</strong></span>
              <span>SIS <strong>{((indicadores.sis||0)*100).toFixed(2)}%</strong></span>
            </div>
            <span style={{fontSize:11,color:'var(--gray-500)',whiteSpace:'nowrap',marginLeft:12}}>
              {fuenteIndicadores === 'API_GATEWAY' ? '🟢 Gael Cloud' : fuenteIndicadores === 'MANUAL' ? '🔵 Manual' : '🟡 Respaldo'}
              {' '}{indicOpen ? '▲' : '▼'}
            </span>
          </button>

          {/* Contenido expandido */}
          {indicOpen && (
            <div style={{padding:'16px',background:'var(--bg)',borderTop:'1px solid #bfdbfe',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20}}>

              {/* Valores UF / UTM */}
              <div>
                <div style={{fontWeight:600,marginBottom:8,color:'var(--gray-700)'}}>Valores UF / UTM / UTA</div>
                <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
                  <tbody>
                    <tr><td style={{color:'var(--gray-500)'}}>UF</td><td style={{textAlign:'right',fontWeight:600}}>${Number(indicadores.uf||0).toLocaleString('es-CL',{minimumFractionDigits:2})}</td></tr>
                    <tr><td style={{color:'var(--gray-500)'}}>UTM</td><td style={{textAlign:'right',fontWeight:600}}>${Number(indicadores.utm||0).toLocaleString('es-CL')}</td></tr>
                    <tr><td style={{color:'var(--gray-500)'}}>UTA (12 × UTM)</td><td style={{textAlign:'right',fontWeight:600}}>${Number(indicadores.uta||0).toLocaleString('es-CL')}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Rentas Tope / Mínimas */}
              <div>
                <div style={{fontWeight:600,marginBottom:8,color:'var(--gray-700)'}}>Rentas Imponibles</div>
                <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
                  <tbody>
                    <tr><td style={{color:'var(--gray-500)'}}>Tope AFP (90 UF)</td><td style={{textAlign:'right',fontWeight:600}}>${Number(indicadores.renta_tope_afp||0).toLocaleString('es-CL')}</td></tr>
                    <tr><td style={{color:'var(--gray-500)'}}>Tope AFC (135.2 UF)</td><td style={{textAlign:'right',fontWeight:600}}>${Number(indicadores.renta_tope_afc||0).toLocaleString('es-CL')}</td></tr>
                    <tr><td style={{color:'var(--gray-500)'}}>Sueldo Mínimo</td><td style={{textAlign:'right',fontWeight:600}}>${Number(indicadores.sueldo_minimo||0).toLocaleString('es-CL')}</td></tr>
                    <tr><td style={{color:'var(--gray-500)'}}>Tope Gratificación (4.75 UTM)</td><td style={{textAlign:'right',fontWeight:600}}>${Number(indicadores.tope_gratif||0).toLocaleString('es-CL')}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Tasas AFP */}
              {afpData.length > 0 && (
                <div>
                  <div style={{fontWeight:600,marginBottom:8,color:'var(--gray-700)'}}>Tasas AFP (dependientes)</div>
                  <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
                    <thead>
                      <tr>
                        <th style={{textAlign:'left',color:'var(--gray-500)',fontWeight:500,paddingBottom:4}}>AFP</th>
                        <th style={{textAlign:'right',color:'var(--gray-500)',fontWeight:500}}>Trabajador</th>
                        <th style={{textAlign:'right',color:'var(--gray-500)',fontWeight:500}}>Empleador (SIS)</th>
                        <th style={{textAlign:'right',color:'var(--gray-500)',fontWeight:500}}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {afpData.map(a => (
                        <tr key={a.nombre}>
                          <td style={{fontWeight:600}}>{a.nombre}</td>
                          <td style={{textAlign:'right'}}>{(a.tasa*100).toFixed(2)}%</td>
                          <td style={{textAlign:'right'}}>{(a.tasa_sis*100).toFixed(2)}%</td>
                          <td style={{textAlign:'right',fontWeight:600}}>{((a.tasa+a.tasa_sis)*100).toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Seguro Cesantía AFC */}
              {afcData.length > 0 && (
                <div>
                  <div style={{fontWeight:600,marginBottom:8,color:'var(--gray-700)'}}>Seguro de Cesantía (AFC)</div>
                  <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
                    <thead>
                      <tr>
                        <th style={{textAlign:'left',color:'var(--gray-500)',fontWeight:500,paddingBottom:4}}>Tipo Contrato</th>
                        <th style={{textAlign:'right',color:'var(--gray-500)',fontWeight:500}}>Empleador</th>
                        <th style={{textAlign:'right',color:'var(--gray-500)',fontWeight:500}}>Trabajador</th>
                      </tr>
                    </thead>
                    <tbody>
                      {afcData.map(tc => (
                        <tr key={tc.codigo}>
                          <td>{tc.nombre}</td>
                          <td style={{textAlign:'right'}}>{(tc.empleador*100).toFixed(1)}%</td>
                          <td style={{textAlign:'right'}}>{tc.trabajador > 0 ? `${(tc.trabajador*100).toFixed(1)}%` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* SIS y Seg. Social */}
              <div>
                <div style={{fontWeight:600,marginBottom:8,color:'var(--gray-700)'}}>Otros Aportes Empleador</div>
                <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
                  <tbody>
                    <tr><td style={{color:'var(--gray-500)'}}>SIS (Seguro Invalidez y Sobrevivencia)</td><td style={{textAlign:'right',fontWeight:600}}>{((indicadores.sis||0)*100).toFixed(2)}%</td></tr>
                    <tr><td style={{color:'var(--gray-500)'}}>Aporte empleador AFP</td><td style={{textAlign:'right',fontWeight:600}}>{((indicadores.aporte_empleador_afp||0)*100).toFixed(2)}%</td></tr>
                    <tr><td style={{color:'var(--gray-500)'}}>Seguro Social (Ley 16.744)</td><td style={{textAlign:'right',fontWeight:600}}>{((indicadores.seguro_social||0)*100).toFixed(1)}%</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Tramos Impuesto Único */}
              {tramosIU.length > 0 && (
                <div style={{gridColumn:'1 / -1'}}>
                  <div style={{fontWeight:600,marginBottom:8,color:'var(--gray-700)'}}>Tramos Impuesto Único (en UTM)</div>
                  <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
                    <thead>
                      <tr>
                        <th style={{textAlign:'right',color:'var(--gray-500)',fontWeight:500,paddingBottom:4}}>Desde (UTM)</th>
                        <th style={{textAlign:'right',color:'var(--gray-500)',fontWeight:500}}>Hasta (UTM)</th>
                        <th style={{textAlign:'right',color:'var(--gray-500)',fontWeight:500}}>Factor</th>
                        <th style={{textAlign:'right',color:'var(--gray-500)',fontWeight:500}}>Rebaja (UTM)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tramosIU.map((t,i) => (
                        <tr key={i}>
                          <td style={{textAlign:'right'}}>{t.desde.toLocaleString('es-CL',{minimumFractionDigits:2})}</td>
                          <td style={{textAlign:'right'}}>{t.hasta != null ? t.hasta.toLocaleString('es-CL',{minimumFractionDigits:2}) : 'y más'}</td>
                          <td style={{textAlign:'right'}}>{(t.factor*100).toFixed(0)}%</td>
                          <td style={{textAlign:'right'}}>{t.monto_rebaja.toLocaleString('es-CL',{minimumFractionDigits:4})}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}
        </div>
      )}

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
