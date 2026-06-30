import { useEffect, useState, useCallback } from 'react'
import { useEmpresa } from '../context/EmpresaContext'
import { libroDiarioApi, planCuentasApi } from '../services/api'

const TIPOS = ['VENTAS', 'COMPRAS', 'RRHH', 'BANCO', 'AJUSTE', 'APERTURA', 'CIERRE']
const AÑO_ACTUAL = new Date().getFullYear()
const AÑOS = Array.from({ length: 6 }, (_, i) => AÑO_ACTUAL - i)
const MESES = [
  { v: '01', l: 'Enero' }, { v: '02', l: 'Febrero' }, { v: '03', l: 'Marzo' },
  { v: '04', l: 'Abril' }, { v: '05', l: 'Mayo' },    { v: '06', l: 'Junio' },
  { v: '07', l: 'Julio' }, { v: '08', l: 'Agosto' },  { v: '09', l: 'Septiembre' },
  { v: '10', l: 'Octubre' },{ v: '11', l: 'Noviembre'},{ v: '12', l: 'Diciembre' },
]

const fmt = n => Number(n || 0).toLocaleString('es-CL')

function lineaVacia(i) {
  return { _key: Date.now() + i, id_cuenta: '', analisis: '', referencia: '', glosa_detalle: '', debe: '', haber: '' }
}

export default function LibroDiario() {
  const { empresaActual } = useEmpresa()
  const [año, setAño]     = useState(String(AÑO_ACTUAL))
  const [mes, setMes]     = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [asientos, setAsientos] = useState([])
  const [cuentas, setCuentas]   = useState([])
  const [cargando, setCargando] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [detalle, setDetalle]   = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]       = useState(null)

  // form state
  const [form, setForm] = useState({ tipo: 'BANCO', fecha: '', glosa: '', lineas: [lineaVacia(0), lineaVacia(1)] })

  const periodo = `${año}${mes}`

  const cargar = useCallback(async () => {
    if (!empresaActual) return
    setCargando(true)
    setError(null)
    try {
      const r = await libroDiarioApi.listar(empresaActual.id, periodo)
      setAsientos(r.data)
    } catch { setError('Error cargando asientos') }
    finally { setCargando(false) }
  }, [empresaActual, periodo])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    planCuentasApi.list().then(r => setCuentas(r.data)).catch(() => {})
  }, [])

  // totales del form
  const totalDebe  = form.lineas.reduce((s, l) => s + (parseFloat(l.debe)  || 0), 0)
  const totalHaber = form.lineas.reduce((s, l) => s + (parseFloat(l.haber) || 0), 0)
  const cuadra     = totalDebe > 0 && totalDebe === totalHaber

  function agregarLinea() {
    setForm(f => ({ ...f, lineas: [...f.lineas, lineaVacia(f.lineas.length)] }))
  }

  function quitarLinea(idx) {
    setForm(f => ({ ...f, lineas: f.lineas.filter((_, i) => i !== idx) }))
  }

  function setLinea(idx, campo, valor) {
    setForm(f => {
      const lineas = [...f.lineas]
      lineas[idx] = { ...lineas[idx], [campo]: valor }
      return { ...f, lineas }
    })
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      const lineas = form.lineas
        .filter(l => l.id_cuenta)
        .map(l => ({
          id_cuenta:     parseInt(l.id_cuenta),
          analisis:      l.analisis || null,
          referencia:    l.referencia || null,
          glosa_detalle: l.glosa_detalle || null,
          debe:          parseFloat(l.debe)  || 0,
          haber:         parseFloat(l.haber) || 0,
        }))

      await libroDiarioApi.crear(empresaActual.id, {
        tipo:    form.tipo,
        fecha:   form.fecha,
        periodo,
        glosa:   form.glosa || null,
        lineas,
      })
      setMostrarForm(false)
      setForm({ tipo: 'BANCO', fecha: '', glosa: '', lineas: [lineaVacia(0), lineaVacia(1)] })
      cargar()
    } catch (e) {
      setError(e.response?.data?.detail || 'Error guardando asiento')
    } finally { setGuardando(false) }
  }

  async function contabilizar(id) {
    try {
      await libroDiarioApi.contabilizar(empresaActual.id, id)
      cargar()
      if (detalle?.id === id) setDetalle(d => ({ ...d, estado: 'CONTABILIZADO' }))
    } catch (e) {
      alert(e.response?.data?.detail || 'Error')
    }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este asiento borrador?')) return
    try {
      await libroDiarioApi.eliminar(empresaActual.id, id)
      cargar()
      if (detalle?.id === id) setDetalle(null)
    } catch (e) {
      alert(e.response?.data?.detail || 'Error')
    }
  }

  async function verDetalle(id) {
    try {
      const r = await libroDiarioApi.obtener(empresaActual.id, id)
      setDetalle(r.data)
    } catch { alert('Error cargando detalle') }
  }

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={año} onChange={e => setAño(e.target.value)} style={selStyle}>
          {AÑOS.map(a => <option key={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={e => setMes(e.target.value)} style={selStyle}>
          {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => { setMostrarForm(true); setDetalle(null) }}>
          + Nuevo Asiento
        </button>
      </div>

      {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: detalle ? '1fr 1fr' : '1fr', gap: 16 }}>
        {/* Lista */}
        <div>
          {cargando ? <p>Cargando...</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--gray-100,#f5f5f5)' }}>
                  <th style={th}>N°</th>
                  <th style={th}>Tipo</th>
                  <th style={th}>Fecha</th>
                  <th style={th}>Glosa</th>
                  <th style={{ ...th, textAlign: 'right' }}>DEBE</th>
                  <th style={{ ...th, textAlign: 'right' }}>HABER</th>
                  <th style={th}>Estado</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {asientos.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#888' }}>Sin asientos en este período</td></tr>
                )}
                {asientos.map(a => (
                  <tr key={a.id} style={{ cursor: 'pointer', background: detalle?.id === a.id ? 'var(--gray-50,#fafafa)' : 'white' }}
                      onClick={() => verDetalle(a.id)}>
                    <td style={td}>{a.numero}</td>
                    <td style={td}><span style={tipoBadge(a.tipo)}>{a.tipo}</span></td>
                    <td style={td}>{a.fecha}</td>
                    <td style={{ ...td, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.glosa || '—'}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(a.total_debe)}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(a.total_haber)}</td>
                    <td style={td}>
                      <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 10,
                        background: a.estado === 'CONTABILIZADO' ? '#e8f5e9' : '#fff8e1',
                        color: a.estado === 'CONTABILIZADO' ? '#2e7d32' : '#f57f17' }}>
                        {a.estado}
                      </span>
                    </td>
                    <td style={td} onClick={e => e.stopPropagation()}>
                      {a.estado === 'BORRADOR' && (
                        <>
                          <button style={btnSm('green')} onClick={() => contabilizar(a.id)}>✓</button>
                          <button style={btnSm('red')}   onClick={() => eliminar(a.id)}>✕</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {asientos.length > 0 && (
                <tfoot>
                  <tr style={{ fontWeight: 700, borderTop: '2px solid #ddd' }}>
                    <td colSpan={4} style={{ ...td, textAlign: 'right' }}>TOTAL</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(asientos.reduce((s, a) => s + Number(a.total_debe), 0))}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(asientos.reduce((s, a) => s + Number(a.total_haber), 0))}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>

        {/* Panel derecho: detalle o formulario */}
        {(detalle || mostrarForm) && (
          <div style={{ border: '1px solid var(--gray-200,#e0e0e0)', borderRadius: 8, padding: 16 }}>
            {mostrarForm && !detalle ? (
              /* Formulario nuevo asiento */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h4 style={{ margin: 0 }}>Nuevo Asiento</h4>
                  <button onClick={() => setMostrarForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div>
                    <label style={label}>Tipo</label>
                    <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={{ ...selStyle, width: '100%' }}>
                      {TIPOS.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={label}>Fecha</label>
                    <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }} />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={label}>Glosa</label>
                    <input type="text" value={form.glosa} onChange={e => setForm(f => ({ ...f, glosa: e.target.value }))}
                      placeholder="Descripción del asiento"
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }} />
                  </div>
                </div>

                {/* Líneas */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 8 }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      <th style={th}>Cuenta</th>
                      <th style={th}>Glosa línea</th>
                      <th style={th}>Referencia</th>
                      <th style={{ ...th, textAlign: 'right' }}>DEBE</th>
                      <th style={{ ...th, textAlign: 'right' }}>HABER</th>
                      <th style={th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.lineas.map((l, i) => (
                      <tr key={l._key}>
                        <td style={td}>
                          <select value={l.id_cuenta} onChange={e => setLinea(i, 'id_cuenta', e.target.value)}
                            style={{ width: '100%', fontSize: 12, padding: '3px 4px', border: '1px solid #ddd', borderRadius: 3 }}>
                            <option value="">— cuenta —</option>
                            {cuentas.filter(c => c.nivel === 'D').map(c => (
                              <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
                            ))}
                          </select>
                        </td>
                        <td style={td}>
                          <input value={l.glosa_detalle} onChange={e => setLinea(i, 'glosa_detalle', e.target.value)}
                            style={{ width: '100%', fontSize: 12, padding: '3px 4px', border: '1px solid #ddd', borderRadius: 3 }} />
                        </td>
                        <td style={td}>
                          <input value={l.referencia} onChange={e => setLinea(i, 'referencia', e.target.value)}
                            style={{ width: 80, fontSize: 12, padding: '3px 4px', border: '1px solid #ddd', borderRadius: 3 }} />
                        </td>
                        <td style={td}>
                          <input type="number" value={l.debe} onChange={e => setLinea(i, 'debe', e.target.value)}
                            style={{ width: 90, textAlign: 'right', fontSize: 12, padding: '3px 4px', border: '1px solid #ddd', borderRadius: 3 }} />
                        </td>
                        <td style={td}>
                          <input type="number" value={l.haber} onChange={e => setLinea(i, 'haber', e.target.value)}
                            style={{ width: 90, textAlign: 'right', fontSize: 12, padding: '3px 4px', border: '1px solid #ddd', borderRadius: 3 }} />
                        </td>
                        <td style={td}>
                          <button onClick={() => quitarLinea(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53935' }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 700 }}>
                      <td colSpan={3} style={{ ...td, textAlign: 'right', fontSize: 12 }}>TOTAL</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: cuadra ? '#2e7d32' : '#c62828' }}>{fmt(totalDebe)}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: cuadra ? '#2e7d32' : '#c62828' }}>{fmt(totalHaber)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>

                {!cuadra && totalDebe > 0 && (
                  <p style={{ color: '#c62828', fontSize: 12, margin: '4px 0' }}>
                    ⚠ El asiento no cuadra — diferencia: {fmt(Math.abs(totalDebe - totalHaber))}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-outline btn-sm" onClick={agregarLinea}>+ Línea</button>
                  <button className="btn btn-primary btn-sm" onClick={guardar} disabled={!cuadra || guardando}>
                    {guardando ? 'Guardando...' : 'Guardar Borrador'}
                  </button>
                </div>
              </div>
            ) : detalle && (
              /* Detalle de asiento */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h4 style={{ margin: 0 }}>Asiento {detalle.numero}</h4>
                  <button onClick={() => setDetalle(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 13, marginBottom: 12 }}>
                  <div><b>Tipo:</b> {detalle.tipo}</div>
                  <div><b>Fecha:</b> {detalle.fecha}</div>
                  <div><b>Período:</b> {detalle.periodo}</div>
                  <div><b>Estado:</b> <span style={{ color: detalle.estado === 'CONTABILIZADO' ? '#2e7d32' : '#f57f17' }}>{detalle.estado}</span></div>
                  {detalle.glosa && <div style={{ gridColumn: '1/-1' }}><b>Glosa:</b> {detalle.glosa}</div>}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      <th style={th}>#</th>
                      <th style={th}>Cuenta</th>
                      <th style={th}>Glosa</th>
                      <th style={{ ...th, textAlign: 'right' }}>DEBE</th>
                      <th style={{ ...th, textAlign: 'right' }}>HABER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.lineas.map(l => (
                      <tr key={l.id}>
                        <td style={td}>{l.linea}</td>
                        <td style={td}><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{l.cuenta.codigo}</span> {l.cuenta.nombre}</td>
                        <td style={td}>{l.glosa_detalle || ''}</td>
                        <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{l.debe > 0 ? fmt(l.debe) : ''}</td>
                        <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{l.haber > 0 ? fmt(l.haber) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 700, borderTop: '2px solid #ddd' }}>
                      <td colSpan={3} style={{ ...td, textAlign: 'right' }}>TOTAL</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(detalle.total_debe)}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(detalle.total_haber)}</td>
                    </tr>
                  </tfoot>
                </table>
                {detalle.estado === 'BORRADOR' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => contabilizar(detalle.id)}>✓ Contabilizar</button>
                    <button className="btn btn-outline btn-sm" style={{ color: 'red', borderColor: 'red' }} onClick={() => eliminar(detalle.id)}>Eliminar</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const selStyle = { padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }
const th = { textAlign: 'left', padding: '6px 8px', fontWeight: 600, fontSize: 12, borderBottom: '1px solid #e0e0e0' }
const td = { padding: '5px 8px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' }
const label = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 3, color: '#555' }

function tipoBadge(tipo) {
  const colores = {
    VENTAS: '#e3f2fd', COMPRAS: '#fce4ec', RRHH: '#f3e5f5',
    BANCO: '#e8f5e9', AJUSTE: '#fff8e1', APERTURA: '#e0f7fa', CIERRE: '#fbe9e7',
  }
  return {
    fontSize: 11, padding: '2px 6px', borderRadius: 10,
    background: colores[tipo] || '#f5f5f5',
  }
}

function btnSm(color) {
  return {
    background: 'none', border: 'none', cursor: 'pointer',
    color, fontWeight: 700, fontSize: 14, marginLeft: 4,
  }
}
