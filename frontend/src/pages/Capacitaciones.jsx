import { useState, useEffect, useCallback } from 'react'
import { useEmpresa } from '../context/EmpresaContext'
import { capacitacionesApi, catalogosApi } from '../services/api'
import api from '../services/api'

const RUT_ARCHIMET = '77.868.358-K'

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
  objetivo_general: '', objetivos_especificos: '',
  lugar_establecimiento: '', material_apoyo: '',
  asistentes: [],
}

function nombreDesdeHeader(disposition, fallback) {
  const rfc = disposition.match(/filename\*=UTF-8''([^\s;]+)/i)
  if (rfc) return decodeURIComponent(rfc[1])
  const classic = disposition.match(/filename="?([^";\s]+)"?/i)
  if (classic) return classic[1]
  return fallback
}
function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nombre
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}


export default function Capacitaciones() {
  const { empresaActual } = useEmpresa()
  const esArchimet = empresaActual?.rut === RUT_ARCHIMET

  const [tab, setTab] = useState('cap')
  const [capacitaciones, setCapacitaciones] = useState([])
  const [procedimientos, setProcedimientos] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [obras, setObras] = useState([])
  const [mostrarFormCap, setMostrarFormCap] = useState(false)
  const [formCap, setFormCap] = useState(CAP_EMPTY)
  const [guardandoCap, setGuardandoCap] = useState(false)
  const [descargando, setDescargando] = useState(null)

  // Archimet: template seleccionado para nuevo registro
  const [templateSeleccionado, setTemplateSeleccionado] = useState(null)

  const procedimientosArchimet = procedimientos.filter(p => p.empresa_rut_filtro === RUT_ARCHIMET)
  const procedimientosGlobales = procedimientos.filter(p => !p.empresa_rut_filtro)

  const cargar = useCallback(async () => {
    if (!empresaActual) return
    setCargando(true); setError('')
    try {
      const [capRes, procRes, empRes, obrasRes] = await Promise.all([
        capacitacionesApi.list(empresaActual.id),
        capacitacionesApi.procedimientos(esArchimet ? empresaActual.rut : null),
        api.get('/empleados').catch(() => ({ data: [] })),
        api.get('/catalogos/obras', { params: { id_empresa: empresaActual.id } }).catch(() => ({ data: [] })),
      ])
      setCapacitaciones(capRes.data)
      setProcedimientos(procRes.data)
      setEmpleados(empRes.data)
      setObras(obrasRes.data)
    } catch (err) {
      const msg = err?.response?.status === 500
        ? 'Error del servidor. Verifica que la migración 30_capacitaciones_archimet.sql fue ejecutada.'
        : 'Error cargando datos'
      setError(msg)
    }
    finally { setCargando(false) }
  }, [empresaActual, esArchimet])

  useEffect(() => { cargar() }, [cargar])

  // Al cambiar de tab, deseleccionar template
  useEffect(() => {
    if (tab !== 'archimet') setTemplateSeleccionado(null)
    setMostrarFormCap(false)
    setFormCap(CAP_EMPTY)
  }, [tab])

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

  function abrirFormArchimet(proc) {
    setTemplateSeleccionado(proc)
    setFormCap({
      ...CAP_EMPTY,
      id_procedimiento: String(proc.id),
      objetivo_general: proc.objetivo_general || '',
      objetivos_especificos: proc.objetivos_especificos || '',
      material_apoyo: proc.codigo || '',
    })
    setMostrarFormCap(true)
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
      await capacitacionesApi.create(empresaActual.id, payload)
      setMostrarFormCap(false)
      setFormCap(CAP_EMPTY)
      setTemplateSeleccionado(null)
      await cargar()
    } catch { alert('Error al guardar') }
    finally { setGuardandoCap(false) }
  }

  async function eliminarCap(id) {
    if (!confirm('¿Eliminar este registro?')) return
    await capacitacionesApi.delete(empresaActual.id, id)
    await cargar()
  }

  async function descargarCap(cap) {
    const esCapArchimet = cap.procedimiento?.empresa_rut_filtro === RUT_ARCHIMET
    setDescargando(cap.id)
    try {
      const res = esCapArchimet
        ? await capacitacionesApi.wordArchimet(empresaActual.id, cap.id)
        : await capacitacionesApi.word(empresaActual.id, cap.id)
      const nombre = nombreDesdeHeader(
        res.headers['content-disposition'] || '',
        `Capacitacion_${cap.id}_${cap.fecha}.docx`
      )
      descargarBlob(new Blob([res.data]), nombre)
    } catch { alert('Error al generar Word') }
    finally { setDescargando(null) }
  }

  if (!empresaActual) return <p>Selecciona una empresa primero.</p>

  const tabs = [
    { key: 'cap', label: '📋 Registro de Capacitación' },
    ...(esArchimet ? [{ key: 'archimet', label: '🏗️ Capacitaciones Archimet' }] : []),
  ]

  // Capacitaciones del tab activo
  const capsArchimet = capacitaciones.filter(c => c.procedimiento?.empresa_rut_filtro === RUT_ARCHIMET)
  const capsGlobales = capacitaciones.filter(c => !c.procedimiento?.empresa_rut_filtro)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h3 style={{ marginBottom: 16 }}>Documentación de Obra</h3>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid var(--gray-200)' }}>
        {tabs.map(t => (
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

      {/* ═══ TAB CAPACITACIÓN GENERAL ═══ */}
      {tab === 'cap' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary" onClick={() => { setMostrarFormCap(true); setFormCap(CAP_EMPTY) }}>
              + Nuevo Registro
            </button>
          </div>

          {mostrarFormCap && (
            <FormCapacitacion
              form={formCap} setForm={setFormCap}
              procedimientos={procedimientosGlobales}
              empleados={empleados}
              obras={obras}
              onProcChange={onProcChange}
              addAsistente={addAsistente}
              addEmpleadoCap={addEmpleadoCap}
              updateAsistente={updateAsistente}
              guardar={guardarCap}
              guardando={guardandoCap}
              cancelar={() => setMostrarFormCap(false)}
              esArchimet={false}
            />
          )}

          <TablaCapacitaciones
            caps={capsGlobales}
            cargando={cargando}
            descargando={descargando}
            onDescargar={descargarCap}
            onEliminar={eliminarCap}
          />
        </>
      )}

      {/* ═══ TAB ARCHIMET ═══ */}
      {tab === 'archimet' && (
        <>
          {/* Selector de template */}
          {!mostrarFormCap && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 12 }}>
                Selecciona el tipo de capacitación para crear un nuevo registro:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {procedimientosArchimet.map(proc => (
                  <button key={proc.id}
                    className="btn btn-outline"
                    style={{ textAlign: 'left', padding: '10px 14px', height: 'auto', lineHeight: 1.4 }}
                    onClick={() => abrirFormArchimet(proc)}>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 2 }}>{proc.codigo}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{proc.nombre}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mostrarFormCap && templateSeleccionado && (
            <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 8, padding: 20, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{templateSeleccionado.codigo}</div>
                  <h4 style={{ margin: 0 }}>{templateSeleccionado.nombre}</h4>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => { setMostrarFormCap(false); setTemplateSeleccionado(null) }}>
                  ← Volver
                </button>
              </div>
              <FormCapacitacion
                form={formCap} setForm={setFormCap}
                procedimientos={[]}
                empleados={empleados}
                obras={obras}
                onProcChange={() => {}}
                addAsistente={addAsistente}
                addEmpleadoCap={addEmpleadoCap}
                updateAsistente={updateAsistente}
                guardar={guardarCap}
                guardando={guardandoCap}
                cancelar={() => { setMostrarFormCap(false); setTemplateSeleccionado(null) }}
                esArchimet={true}
              />
            </div>
          )}

          <TablaCapacitaciones
            caps={capsArchimet}
            cargando={cargando}
            descargando={descargando}
            onDescargar={descargarCap}
            onEliminar={eliminarCap}
            etiquetaArchimet
          />
        </>
      )}
    </div>
  )
}


// ─── Componente formulario ────────────────────────────────────────────────────

function FormCapacitacion({ form, setForm, procedimientos, empleados, obras = [], onProcChange,
  addAsistente, addEmpleadoCap, updateAsistente, guardar, guardando, cancelar, esArchimet }) {

  const labelCargo = esArchimet ? 'Cargo del Relator' : 'Área del Relator'

  return (
    <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 8, padding: 24, marginBottom: 24 }}>
      {!esArchimet && <h4 style={{ marginTop: 0 }}>Nuevo Registro de Asistencia a Capacitación</h4>}
      <form onSubmit={guardar}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {!esArchimet && (
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Procedimiento</label>
              <select className="form-control" value={form.id_procedimiento} onChange={onProcChange}>
                <option value="">-- Seleccionar procedimiento --</option>
                {procedimientos.map(p => (
                  <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {!esArchimet && (
            <div className="form-group">
              <label>Motivo *</label>
              <select className="form-control" value={form.motivo}
                onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}>
                {MOTIVOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Fecha *</label>
            <input type="date" className="form-control" required value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
          </div>

          <div className="form-group">
            <label>Hora Inicio</label>
            <input type="text" className="form-control" placeholder="8:00" value={form.hora_inicio}
              onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} />
          </div>

          <div className="form-group">
            <label>Hora Término</label>
            <input type="text" className="form-control" placeholder="9:00" value={form.hora_termino}
              onChange={e => setForm(f => ({ ...f, hora_termino: e.target.value }))} />
          </div>

          <div className="form-group">
            <label>Duración (horas)</label>
            <input type="number" step="0.5" className="form-control" value={form.duracion_horas}
              onChange={e => setForm(f => ({ ...f, duracion_horas: e.target.value }))} />
          </div>

          <div className="form-group">
            <label>Obra</label>
            {esArchimet && obras.length > 0 ? (
              <select className="form-control" value={form.obra}
                onChange={e => setForm(f => ({ ...f, obra: e.target.value }))}>
                <option value="">— Sin obra —</option>
                {obras.map(o => (
                  <option key={o.id} value={o.nombre}>{o.codigo} — {o.nombre}</option>
                ))}
              </select>
            ) : (
              <input type="text" className="form-control" value={form.obra}
                onChange={e => setForm(f => ({ ...f, obra: e.target.value }))} />
            )}
          </div>

          <div className="form-group">
            <label>Nombre del Relator</label>
            <input type="text" className="form-control" value={form.relator_nombre}
              onChange={e => setForm(f => ({ ...f, relator_nombre: e.target.value }))} />
          </div>

          <div className="form-group">
            <label>{labelCargo}</label>
            <input type="text" className="form-control" value={form.relator_area}
              onChange={e => setForm(f => ({ ...f, relator_area: e.target.value }))} />
          </div>

          <div className="form-group">
            <label>RUT del Relator</label>
            <input type="text" className="form-control" value={form.relator_rut}
              onChange={e => setForm(f => ({ ...f, relator_rut: e.target.value }))} />
          </div>

          {esArchimet && (
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Lugar / Establecimiento</label>
              <input type="text" className="form-control" value={form.lugar_establecimiento}
                onChange={e => setForm(f => ({ ...f, lugar_establecimiento: e.target.value }))} />
            </div>
          )}

          {esArchimet && (
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Material de Apoyo</label>
              <input type="text" className="form-control" value={form.material_apoyo}
                onChange={e => setForm(f => ({ ...f, material_apoyo: e.target.value }))} />
            </div>
          )}
        </div>

        {!esArchimet && (
          <>
            <div className="form-group">
              <label>Objetivo General</label>
              <textarea className="form-control" rows={2} value={form.objetivo_general}
                onChange={e => setForm(f => ({ ...f, objetivo_general: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Objetivos Específicos</label>
              <textarea className="form-control" rows={4} value={form.objetivos_especificos}
                onChange={e => setForm(f => ({ ...f, objetivos_especificos: e.target.value }))} />
            </div>
          </>
        )}

        {/* Asistentes */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong>Participantes ({form.asistentes.length})</strong>
            <div style={{ display: 'flex', gap: 8 }}>
              {!esArchimet && (
                <button type="button" className="btn btn-outline btn-sm" onClick={addAsistente}>+ Manual</button>
              )}
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

          {form.asistentes.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--gray-100)' }}>
                  <th style={{ padding: '4px 8px', textAlign: 'left', width: 30 }}>N°</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left' }}>Nombre</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left' }}>{esArchimet ? 'Cargo' : 'Área'}</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', width: 120 }}>RUT</th>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {form.asistentes.map((a, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                    <td style={{ padding: '4px 8px', color: 'var(--gray-500)' }}>{idx + 1}</td>
                    {['nombre', 'area', 'rut'].map(field => (
                      <td key={field} style={{ padding: '4px 4px' }}>
                        <input type="text" value={a[field] || ''} onChange={e => updateAsistente(idx, field, e.target.value)}
                          style={{ width: '100%', border: '1px solid var(--gray-300)', borderRadius: 4, padding: '2px 6px', fontSize: 12 }} />
                      </td>
                    ))}
                    <td style={{ padding: '4px 8px' }}>
                      <button type="button" onClick={() => setForm(f => ({ ...f, asistentes: f.asistentes.filter((_, i) => i !== idx) }))}
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
          <button type="button" className="btn btn-outline" onClick={cancelar}>Cancelar</button>
        </div>
      </form>
    </div>
  )
}


// ─── Tabla de registros ───────────────────────────────────────────────────────

function TablaCapacitaciones({ caps, cargando, descargando, onDescargar, onEliminar, etiquetaArchimet }) {
  if (cargando) return <p>Cargando...</p>

  if (caps.length === 0) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-500)' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
      <p>No hay registros de capacitación. Crea el primero.</p>
    </div>
  )

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>{etiquetaArchimet ? 'Tipo' : 'Procedimiento'}</th>
          {!etiquetaArchimet && <th>Motivo</th>}
          <th>Obra</th>
          <th>Relator</th>
          <th style={{ textAlign: 'center' }}>Asistentes</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {caps.map(cap => (
          <tr key={cap.id}>
            <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{cap.fecha}</td>
            <td style={{ fontSize: 12 }}>{cap.procedimiento?.nombre || '—'}</td>
            {!etiquetaArchimet && (
              <td style={{ fontSize: 12 }}>{MOTIVOS.find(m => m.value === cap.motivo)?.label || cap.motivo}</td>
            )}
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
                  onClick={() => onDescargar(cap)}>
                  {descargando === cap.id ? '...' : '📄 Word'}
                </button>
                <button className="btn btn-sm"
                  style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: 'none' }}
                  onClick={() => onEliminar(cap.id)}>Eliminar</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
