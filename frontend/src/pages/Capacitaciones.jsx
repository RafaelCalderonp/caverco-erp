import { useState, useEffect, useCallback } from 'react'
import { useEmpresa } from '../context/EmpresaContext'
import api from '../services/api'

const MOTIVOS = [
  { value: 'CHARLA_INDUCCION', label: 'Charla de Inducción' },
  { value: 'CAPACITACION',     label: 'Capacitación' },
  { value: 'ENTRENAMIENTO',    label: 'Entrenamientos' },
  { value: 'OTRAS',            label: 'Otras' },
]

const CAP_EMPTY = {
  id_procedimiento: '', version: '01', motivo: 'CAPACITACION',
  fecha: new Date().toISOString().slice(0, 10),
  hora_inicio: '8:00', hora_termino: '9:00', duracion_horas: '1',
  obra: '', relator_nombre: 'Salvador Calderón',
  relator_area: 'Prevención de riesgos', relator_rut: '18.512.365-0',
  objetivo_general: '', objetivos_especificos: '', asistentes: [],
}


export default function Capacitaciones() {
  const { empresaActual } = useEmpresa()
  const [tab, setTab] = useState('cap')
  const [capacitaciones, setCapacitaciones] = useState([])
  const [procedimientos, setProcedimientos] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // Formularios
  const [mostrarFormCap, setMostrarFormCap] = useState(false)
  const [formCap, setFormCap] = useState(CAP_EMPTY)
  const [guardandoCap, setGuardandoCap] = useState(false)
  const [descargando, setDescargando] = useState(null)

  const cargar = useCallback(async () => {
    if (!empresaActual) return
    setCargando(true); setError('')
    try {
      const [capRes, procRes, empRes] = await Promise.all([
        api.get(`/empresas/${empresaActual.id}/capacitaciones`),
        api.get('/procedimientos-capacitacion'),
        api.get('/empleados').catch(() => ({ data: [] })),
      ])
      setCapacitaciones(capRes.data)
      setProcedimientos(procRes.data)
      setEmpleados(empRes.data)
    } catch (err) {
      const msg = err?.response?.status === 500
        ? 'Error del servidor. Verifica que la migración 25_capacitaciones_v2.sql fue ejecutada en la base de datos.'
        : 'Error cargando datos'
      setError(msg)
    }
    finally { setCargando(false) }
  }, [empresaActual])

  useEffect(() => { cargar() }, [cargar])

  // ── Capacitación helpers ─────────────────────────────────────────────────
  function onProcChange(e) {
    const id = e.target.value
    const proc = procedimientos.find(p => String(p.id) === id)
    setFormCap(f => ({
      ...f,
      id_procedimiento: id,
      objetivo_general: proc?.objetivo_general || '',
      objetivos_especificos: proc?.objetivos_especificos || '',
    }))
  }

  function addAsistente() {
    setFormCap(f => ({ ...f, asistentes: [...f.asistentes, { nombre: '', area: '', rut: '' }] }))
  }

  function addEmpleadoCap(emp) {
    const nombre = `${emp.nombres} ${emp.apellido_paterno} ${emp.apellido_materno || ''}`.trim()
    setFormCap(f => ({
      ...f,
      asistentes: [...f.asistentes, { nombre, area: emp.cargo_nombre || '', rut: emp.rut || '' }],
    }))
  }

  function updateAsistente(idx, field, val) {
    setFormCap(f => {
      const arr = [...f.asistentes]
      arr[idx] = { ...arr[idx], [field]: val }
      return { ...f, asistentes: arr }
    })
  }

  async function guardarCap(e) {
    e.preventDefault()
    setGuardandoCap(true)
    try {
      const payload = {
        ...formCap,
        id_procedimiento: formCap.id_procedimiento ? Number(formCap.id_procedimiento) : null,
        duracion_horas: formCap.duracion_horas ? Number(formCap.duracion_horas) : null,
        asistentes: formCap.asistentes.map((a, i) => ({ ...a, orden: i + 1 })),
      }
      await api.post(`/empresas/${empresaActual.id}/capacitaciones`, payload)
      setMostrarFormCap(false)
      setFormCap(CAP_EMPTY)
      await cargar()
    } catch { alert('Error al guardar') }
    finally { setGuardandoCap(false) }
  }

  async function eliminarCap(id) {
    if (!confirm('¿Eliminar este registro?')) return
    await api.delete(`/empresas/${empresaActual.id}/capacitaciones/${id}`)
    await cargar()
  }

  async function descargarCap(id, codigo, fecha) {
    setDescargando(id)
    try {
      const res = await api.get(`/empresas/${empresaActual.id}/capacitaciones/${id}/word`, { responseType: 'blob' })
      _download(res.data, `Capacitacion_${codigo || id}_${fecha}.docx`)
    } catch { alert('Error al generar Word') }
    finally { setDescargando(null) }
  }

  function _download(blob, fname) {
    const url = URL.createObjectURL(new Blob([blob]))
    const a = document.createElement('a'); a.href = url; a.download = fname; a.click()
    URL.revokeObjectURL(url)
  }

  if (!empresaActual) return <p>Selecciona una empresa primero.</p>

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h3 style={{ marginBottom: 16 }}>Documentación de Obra</h3>

      {/* Pestañas */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid var(--gray-200)' }}>
        {[
          { key: 'cap', label: '📋 Registro de Capacitación' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13,
              background: 'none', borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
              color: tab === t.key ? 'var(--primary)' : 'var(--gray-600)', fontWeight: tab === t.key ? 600 : 400,
              marginBottom: -2,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* ═══ TAB CAPACITACIÓN ═══ */}
      {tab === 'cap' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary" onClick={() => { setMostrarFormCap(true); setFormCap(CAP_EMPTY) }}>
              + Nuevo Registro
            </button>
          </div>

          {mostrarFormCap && (
            <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 8, padding: 24, marginBottom: 24 }}>
              <h4 style={{ marginTop: 0 }}>Nuevo Registro de Asistencia a Capacitación</h4>
              <form onSubmit={guardarCap}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Procedimiento</label>
                    <select className="form-control" value={formCap.id_procedimiento} onChange={onProcChange}>
                      <option value="">-- Seleccionar procedimiento --</option>
                      {procedimientos.map(p => (
                        <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Motivo *</label>
                    <select className="form-control" value={formCap.motivo}
                      onChange={e => setFormCap(f => ({ ...f, motivo: e.target.value }))}>
                      {MOTIVOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Fecha *</label>
                    <input type="date" className="form-control" required value={formCap.fecha}
                      onChange={e => setFormCap(f => ({ ...f, fecha: e.target.value }))} />
                  </div>

                  <div className="form-group">
                    <label>Hora Inicio</label>
                    <input type="text" className="form-control" placeholder="8:00" value={formCap.hora_inicio}
                      onChange={e => setFormCap(f => ({ ...f, hora_inicio: e.target.value }))} />
                  </div>

                  <div className="form-group">
                    <label>Hora Término</label>
                    <input type="text" className="form-control" placeholder="9:00" value={formCap.hora_termino}
                      onChange={e => setFormCap(f => ({ ...f, hora_termino: e.target.value }))} />
                  </div>

                  <div className="form-group">
                    <label>Duración (horas)</label>
                    <input type="number" step="0.5" className="form-control" value={formCap.duracion_horas}
                      onChange={e => setFormCap(f => ({ ...f, duracion_horas: e.target.value }))} />
                  </div>

                  <div className="form-group">
                    <label>Obra</label>
                    <input type="text" className="form-control" value={formCap.obra}
                      onChange={e => setFormCap(f => ({ ...f, obra: e.target.value }))} />
                  </div>

                  <div className="form-group">
                    <label>Nombre del Relator</label>
                    <input type="text" className="form-control" value={formCap.relator_nombre}
                      onChange={e => setFormCap(f => ({ ...f, relator_nombre: e.target.value }))} />
                  </div>

                  <div className="form-group">
                    <label>Área del Relator</label>
                    <input type="text" className="form-control" value={formCap.relator_area}
                      onChange={e => setFormCap(f => ({ ...f, relator_area: e.target.value }))} />
                  </div>

                  <div className="form-group">
                    <label>RUT del Relator</label>
                    <input type="text" className="form-control" value={formCap.relator_rut}
                      onChange={e => setFormCap(f => ({ ...f, relator_rut: e.target.value }))} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Objetivo General</label>
                  <textarea className="form-control" rows={2} value={formCap.objetivo_general}
                    onChange={e => setFormCap(f => ({ ...f, objetivo_general: e.target.value }))} />
                </div>

                <div className="form-group">
                  <label>Objetivos Específicos</label>
                  <textarea className="form-control" rows={4} value={formCap.objetivos_especificos}
                    onChange={e => setFormCap(f => ({ ...f, objetivos_especificos: e.target.value }))} />
                </div>

                {/* Asistentes */}
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <strong>Asistentes ({formCap.asistentes.length})</strong>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="btn btn-outline btn-sm" onClick={addAsistente}>+ Manual</button>
                      <select className="form-control" style={{ width: 'auto', fontSize: 12 }}
                        onChange={e => { const emp = empleados.find(x => String(x.id) === e.target.value); if (emp) addEmpleadoCap(emp); e.target.value = '' }}>
                        <option value="">+ Desde empleados...</option>
                        {empleados.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.nombres} {emp.apellido_paterno} — {emp.rut}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {formCap.asistentes.length > 0 && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'var(--gray-100)' }}>
                          <th style={{ padding: '4px 8px', textAlign: 'left', width: 30 }}>N°</th>
                          <th style={{ padding: '4px 8px', textAlign: 'left' }}>Nombre</th>
                          <th style={{ padding: '4px 8px', textAlign: 'left' }}>Área</th>
                          <th style={{ padding: '4px 8px', textAlign: 'left', width: 120 }}>RUT</th>
                          <th style={{ width: 30 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formCap.asistentes.map((a, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                            <td style={{ padding: '4px 8px', color: 'var(--gray-500)' }}>{idx + 1}</td>
                            {['nombre', 'area', 'rut'].map(field => (
                              <td key={field} style={{ padding: '4px 4px' }}>
                                <input type="text" value={a[field] || ''} onChange={e => updateAsistente(idx, field, e.target.value)}
                                  style={{ width: '100%', border: '1px solid var(--gray-300)', borderRadius: 4, padding: '2px 6px', fontSize: 12 }} />
                              </td>
                            ))}
                            <td style={{ padding: '4px 8px' }}>
                              <button type="button" onClick={() => setFormCap(f => ({ ...f, asistentes: f.asistentes.filter((_, i) => i !== idx) }))}
                                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }}>×</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <button type="submit" className="btn btn-primary" disabled={guardandoCap}>
                    {guardandoCap ? 'Guardando...' : 'Guardar Registro'}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => setMostrarFormCap(false)}>Cancelar</button>
                </div>
              </form>
            </div>
          )}

          {cargando ? <p>Cargando...</p> : capacitaciones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-500)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <p>No hay registros de capacitación. Crea el primero.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th><th>Procedimiento</th><th>Motivo</th>
                  <th>Obra</th><th>Relator</th><th style={{ textAlign: 'center' }}>Asistentes</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {capacitaciones.map(cap => (
                  <tr key={cap.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{cap.fecha}</td>
                    <td style={{ fontSize: 12 }}>{cap.procedimiento?.nombre || '—'}</td>
                    <td style={{ fontSize: 12 }}>{MOTIVOS.find(m => m.value === cap.motivo)?.label || cap.motivo}</td>
                    <td style={{ fontSize: 12 }}>{cap.obra || '—'}</td>
                    <td style={{ fontSize: 12 }}>{cap.relator_nombre || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                        {cap.asistentes?.length || 0}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-outline btn-sm" disabled={descargando === cap.id}
                          onClick={() => descargarCap(cap.id, cap.procedimiento?.codigo, cap.fecha)}>
                          {descargando === cap.id ? '...' : '📄 Word'}
                        </button>
                        <button className="btn btn-sm"
                          style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: 'none' }}
                          onClick={() => eliminarCap(cap.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

    </div>
  )
}
