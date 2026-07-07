import { useState, useEffect, useCallback } from 'react'
import { useEmpresa } from '../context/EmpresaContext'
import api from '../services/api'

const CATEGORIAS = [
  { value: 'CHARLA_ESPECIFICA',  label: 'Charla Específica' },
  { value: 'CHARLA_OPERACIONAL', label: 'Charla Operacional' },
  { value: 'CHARLA_SEMANAL',     label: 'Charla Integral Semanal' },
  { value: 'REINDUCCION',        label: 'Reinducción' },
  { value: 'CURSO',              label: 'Curso de Capacitación / Taller' },
  { value: 'CONTACTO_PERSONAL',  label: 'Contacto Personal' },
]
const TIPOS = ['SSO', 'MA', 'CAL']

const CAP_EMPTY = {
  id_procedimiento: '',
  categoria: 'CHARLA_ESPECIFICA',
  categoria_tipo: 'SSO',
  fecha: new Date().toISOString().slice(0, 10),
  hora: '',
  obra: '',
  relator_nombre: '',
  relator_cargo: '',
  lugar: '',
  material_apoyo: '',
  duracion_horas: '',
  total_hh: '',
  tema_descripcion: '',
  asistentes: [],
}

const ASISTENTE_EMPTY = { nombre: '', cargo: '', rut: '' }

export default function Capacitaciones() {
  const { empresaActual } = useEmpresa()
  const [capacitaciones, setCapacitaciones] = useState([])
  const [procedimientos, setProcedimientos] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(CAP_EMPTY)
  const [guardando, setGuardando] = useState(false)
  const [descargando, setDescargando] = useState(null)

  const cargar = useCallback(async () => {
    if (!empresaActual) return
    setCargando(true)
    setError('')
    try {
      const [capRes, procRes, empRes] = await Promise.all([
        api.get(`/empresas/${empresaActual.id}/capacitaciones`),
        api.get('/procedimientos-capacitacion'),
        api.get('/empleados'),
      ])
      setCapacitaciones(capRes.data)
      setProcedimientos(procRes.data)
      setEmpleados(empRes.data)
    } catch {
      setError('Error cargando capacitaciones')
    } finally {
      setCargando(false)
    }
  }, [empresaActual])

  useEffect(() => { cargar() }, [cargar])

  function onProcedimientoChange(e) {
    const id = e.target.value
    const proc = procedimientos.find(p => String(p.id) === id)
    setForm(f => ({
      ...f,
      id_procedimiento: id,
      tema_descripcion: proc?.descripcion || '',
    }))
  }

  function addAsistente() {
    setForm(f => ({ ...f, asistentes: [...f.asistentes, { ...ASISTENTE_EMPTY }] }))
  }

  function addEmpleado(emp) {
    setForm(f => ({
      ...f,
      asistentes: [...f.asistentes, { nombre: `${emp.nombre} ${emp.apellido_paterno} ${emp.apellido_materno || ''}`.trim(), cargo: emp.cargo_nombre || '', rut: emp.rut || '' }],
    }))
  }

  function updateAsistente(idx, field, val) {
    setForm(f => {
      const arr = [...f.asistentes]
      arr[idx] = { ...arr[idx], [field]: val }
      return { ...f, asistentes: arr }
    })
  }

  function removeAsistente(idx) {
    setForm(f => ({ ...f, asistentes: f.asistentes.filter((_, i) => i !== idx) }))
  }

  async function guardar(e) {
    e.preventDefault()
    if (!form.fecha) return
    setGuardando(true)
    try {
      const payload = {
        ...form,
        id_procedimiento: form.id_procedimiento ? Number(form.id_procedimiento) : null,
        duracion_horas: form.duracion_horas ? Number(form.duracion_horas) : null,
        total_hh: form.total_hh ? Number(form.total_hh) : null,
        asistentes: form.asistentes.map((a, i) => ({ ...a, orden: i + 1 })),
      }
      await api.post(`/empresas/${empresaActual.id}/capacitaciones`, payload)
      setMostrarForm(false)
      setForm(CAP_EMPTY)
      await cargar()
    } catch {
      alert('Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este registro?')) return
    try {
      await api.delete(`/empresas/${empresaActual.id}/capacitaciones/${id}`)
      await cargar()
    } catch {
      alert('Error al eliminar')
    }
  }

  async function descargarWord(id, proc_codigo, fecha) {
    setDescargando(id)
    try {
      const res = await api.get(`/empresas/${empresaActual.id}/capacitaciones/${id}/word`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `Capacitacion_${proc_codigo || id}_${fecha}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Error al generar Word')
    } finally {
      setDescargando(null)
    }
  }

  if (!empresaActual) return <p>Selecciona una empresa primero.</p>

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0 }}>Registros de Capacitación y Entrenamiento</h3>
        <button className="btn btn-primary" onClick={() => { setMostrarForm(true); setForm(CAP_EMPTY) }}>
          + Nuevo Registro
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* ── FORMULARIO ── */}
      {mostrarForm && (
        <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 8, padding: 24, marginBottom: 24 }}>
          <h4 style={{ marginTop: 0 }}>Nuevo Registro de Capacitación</h4>
          <form onSubmit={guardar}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              <div className="form-group">
                <label>Procedimiento</label>
                <select className="form-control" value={form.id_procedimiento} onChange={onProcedimientoChange}>
                  <option value="">-- Seleccionar procedimiento --</option>
                  {procedimientos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Categoría *</label>
                <select className="form-control" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} required>
                  {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Tipo (SSO / MA / CAL)</label>
                <select className="form-control" value={form.categoria_tipo} onChange={e => setForm(f => ({ ...f, categoria_tipo: e.target.value }))}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Fecha *</label>
                <input type="date" className="form-control" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
              </div>

              <div className="form-group">
                <label>Hora</label>
                <input type="text" className="form-control" placeholder="Ej: 08:30" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} />
              </div>

              <div className="form-group">
                <label>Obra</label>
                <input type="text" className="form-control" value={form.obra} onChange={e => setForm(f => ({ ...f, obra: e.target.value }))} />
              </div>

              <div className="form-group">
                <label>Nombre del Relator</label>
                <input type="text" className="form-control" value={form.relator_nombre} onChange={e => setForm(f => ({ ...f, relator_nombre: e.target.value }))} />
              </div>

              <div className="form-group">
                <label>Cargo del Relator</label>
                <input type="text" className="form-control" value={form.relator_cargo} onChange={e => setForm(f => ({ ...f, relator_cargo: e.target.value }))} />
              </div>

              <div className="form-group">
                <label>Lugar / Establecimiento</label>
                <input type="text" className="form-control" value={form.lugar} onChange={e => setForm(f => ({ ...f, lugar: e.target.value }))} />
              </div>

              <div className="form-group">
                <label>Material de Apoyo</label>
                <input type="text" className="form-control" value={form.material_apoyo} onChange={e => setForm(f => ({ ...f, material_apoyo: e.target.value }))} />
              </div>

              <div className="form-group">
                <label>Duración (horas)</label>
                <input type="number" step="0.5" className="form-control" value={form.duracion_horas} onChange={e => setForm(f => ({ ...f, duracion_horas: e.target.value }))} />
              </div>

              <div className="form-group">
                <label>Total HH</label>
                <input type="number" step="0.5" className="form-control" value={form.total_hh} onChange={e => setForm(f => ({ ...f, total_hh: e.target.value }))} />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 8 }}>
              <label>Tema Tratado (se pre-carga del procedimiento, editable)</label>
              <textarea className="form-control" rows={5} value={form.tema_descripcion} onChange={e => setForm(f => ({ ...f, tema_descripcion: e.target.value }))} />
            </div>

            {/* ── ASISTENTES ── */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong>Asistentes ({form.asistentes.length})</strong>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={addAsistente}>+ Agregar manual</button>
                  <details style={{ position: 'relative' }}>
                    <summary className="btn btn-outline btn-sm" style={{ cursor: 'pointer', listStyle: 'none' }}>
                      + Desde empleados ▾
                    </summary>
                    <div style={{
                      position: 'absolute', right: 0, top: '100%', zIndex: 100,
                      background: 'var(--white)', border: '1px solid var(--gray-200)',
                      borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      maxHeight: 260, overflowY: 'auto', width: 320, padding: 8,
                    }}>
                      {empleados.map(emp => (
                        <div
                          key={emp.id}
                          style={{ padding: '6px 8px', cursor: 'pointer', borderRadius: 4, fontSize: 13 }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-100)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          onClick={() => addEmpleado(emp)}
                        >
                          {emp.nombre} {emp.apellido_paterno} — {emp.rut}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              </div>

              {form.asistentes.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--gray-100)' }}>
                      <th style={{ padding: '4px 8px', textAlign: 'left' }}>Nº</th>
                      <th style={{ padding: '4px 8px', textAlign: 'left' }}>Nombre</th>
                      <th style={{ padding: '4px 8px', textAlign: 'left' }}>Cargo</th>
                      <th style={{ padding: '4px 8px', textAlign: 'left' }}>RUT</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.asistentes.map((a, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                        <td style={{ padding: '4px 8px', color: 'var(--gray-500)' }}>{idx + 1}</td>
                        <td style={{ padding: '4px 8px' }}>
                          <input type="text" value={a.nombre} onChange={e => updateAsistente(idx, 'nombre', e.target.value)}
                            style={{ width: '100%', border: '1px solid var(--gray-300)', borderRadius: 4, padding: '2px 6px' }} />
                        </td>
                        <td style={{ padding: '4px 8px' }}>
                          <input type="text" value={a.cargo} onChange={e => updateAsistente(idx, 'cargo', e.target.value)}
                            style={{ width: '100%', border: '1px solid var(--gray-300)', borderRadius: 4, padding: '2px 6px' }} />
                        </td>
                        <td style={{ padding: '4px 8px' }}>
                          <input type="text" value={a.rut} onChange={e => updateAsistente(idx, 'rut', e.target.value)}
                            style={{ width: '100%', border: '1px solid var(--gray-300)', borderRadius: 4, padding: '2px 6px' }} />
                        </td>
                        <td style={{ padding: '4px 8px' }}>
                          <button type="button" onClick={() => removeAsistente(idx)}
                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button type="submit" className="btn btn-primary" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar Registro'}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setMostrarForm(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* ── LISTA ── */}
      {cargando ? (
        <p>Cargando...</p>
      ) : capacitaciones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-500)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <p>No hay registros de capacitación aún.</p>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Procedimiento</th>
              <th>Categoría</th>
              <th>Obra</th>
              <th>Relator</th>
              <th>Asistentes</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {capacitaciones.map(cap => (
              <tr key={cap.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{cap.fecha}</td>
                <td style={{ fontSize: 13 }}>{cap.procedimiento?.nombre || '—'}</td>
                <td style={{ fontSize: 12 }}>{CATEGORIAS.find(c => c.value === cap.categoria)?.label || cap.categoria}</td>
                <td style={{ fontSize: 13 }}>{cap.obra || '—'}</td>
                <td style={{ fontSize: 13 }}>{cap.relator_nombre || '—'}</td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{
                    background: 'var(--primary-light)', color: 'var(--primary)',
                    borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 600,
                  }}>
                    {cap.asistentes?.length || 0}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={descargando === cap.id}
                      onClick={() => descargarWord(cap.id, cap.procedimiento?.codigo, cap.fecha)}
                    >
                      {descargando === cap.id ? '...' : '📄 Word'}
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: 'none' }}
                      onClick={() => eliminar(cap.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
