import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { contratosApi, catalogosApi, empleadosApi } from '../services/api'

const EMPTY = {
  id_empleado: '', id_tipo_contrato: '', id_obra: '', id_centro_costo: '', id_cargo: '',
  numero_contrato: '', fecha_contrato: '', fecha_inicio: '', fecha_termino_pactada: '',
  sueldo_bruto: '553553', horas_semanales: 45, jornada: 'Completa',
}

function Campo({ label, required, children, span2 }) {
  return (
    <div className={`form-group${span2 ? ' span2' : ''}`}>
      <label className="form-label">{label}{required && <span style={{color:'var(--danger)'}}> *</span>}</label>
      {children}
    </div>
  )
}

export default function ContratoNuevo() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const idEmpleadoQuery = params.get('id_empleado') || ''

  const [form, setForm] = useState({ ...EMPTY, id_empleado: idEmpleadoQuery })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [empleados, setEmpleados] = useState([])
  const [tiposContrato, setTiposContrato] = useState([])
  const [obras, setObras] = useState([])
  const [centrosCosto, setCentrosCosto] = useState([])
  const [cargos, setCargos] = useState([])

  useEffect(() => {
    empleadosApi.list({ activo: true }).then(r => setEmpleados(r.data)).catch(() => {})
    catalogosApi.tiposContrato().then(r => setTiposContrato(r.data)).catch(() => {})
    catalogosApi.obras().then(r => setObras(r.data)).catch(() => {})
    catalogosApi.centrosCosto().then(r => setCentrosCosto(r.data)).catch(() => {})
    catalogosApi.cargos().then(r => setCargos(r.data)).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.id_empleado)      e.id_empleado = 'Empleado requerido'
    if (!form.id_tipo_contrato) e.id_tipo_contrato = 'Tipo de contrato requerido'
    if (!form.fecha_contrato)   e.fecha_contrato = 'Fecha del contrato requerida'
    if (!form.fecha_inicio)     e.fecha_inicio = 'Fecha de inicio requerida'
    if (!form.sueldo_bruto)     e.sueldo_bruto = 'Sueldo bruto requerido'
    return e
  }

  const submit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true); setMsg('')
    try {
      const payload = {
        ...form,
        id_empleado: Number(form.id_empleado),
        id_tipo_contrato: Number(form.id_tipo_contrato),
        id_obra: form.id_obra ? Number(form.id_obra) : null,
        id_centro_costo: form.id_centro_costo ? Number(form.id_centro_costo) : null,
        id_cargo: form.id_cargo ? Number(form.id_cargo) : null,
        sueldo_bruto: Number(form.sueldo_bruto),
        horas_semanales: Number(form.horas_semanales),
        fecha_termino_pactada: form.fecha_termino_pactada || null,
        numero_contrato: form.numero_contrato || null,
      }
      const r = await contratosApi.create(payload)
      nav(`/contratos/${r.data.id}`)
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Error al guardar el contrato')
    } finally { setSaving(false) }
  }

  const err = (k) => errors[k] ? (
    <span style={{fontSize:11,color:'var(--danger)',marginTop:2,display:'block'}}>{errors[k]}</span>
  ) : null

  const inp = (k, type='text', placeholder='') => (
    <>
      <input className={`input${errors[k]?' input-error':''}`} type={type}
        placeholder={placeholder} value={form[k]}
        onChange={e => set(k, e.target.value)}
        style={errors[k]?{borderColor:'var(--danger)'}:{}} />
      {err(k)}
    </>
  )

  const sel = (k, opts, placeholder='Seleccionar…') => (
    <>
      <select className="select" value={form[k]} onChange={e => set(k, e.target.value)}
        style={errors[k]?{borderColor:'var(--danger)'}:{}}>
        <option value="">{placeholder}</option>
        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {err(k)}
    </>
  )

  return (
    <div style={{maxWidth: 800}}>
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Link to="/contratos" className="btn btn-outline btn-sm">← Volver</Link>
          <h1>Nuevo Contrato</h1>
        </div>
      </div>

      <div className="card">
        {msg && (
          <div style={{padding:'10px 14px',borderRadius:6,marginBottom:16,background:'#fee2e2',color:'#b91c1c'}}>
            {msg}
          </div>
        )}

        <div className="form-grid">
          <Campo label="Empleado" required>
            {sel('id_empleado', empleados.map(e => ({ value: e.id, label: `${e.nombres} ${e.apellido_paterno} — ${e.rut}` })))}
          </Campo>
          <Campo label="Tipo de Contrato" required>
            {sel('id_tipo_contrato', tiposContrato.map(t => ({ value: t.id, label: t.nombre })))}
          </Campo>
          <Campo label="N° de Contrato">
            {inp('numero_contrato', 'text', 'Ej: C-2026-001')}
          </Campo>
          <Campo label="Fecha del Contrato" required>
            {inp('fecha_contrato', 'date')}
          </Campo>
          <Campo label="Fecha de Inicio" required>
            {inp('fecha_inicio', 'date')}
          </Campo>
          <Campo label="Fecha Término Pactada">
            {inp('fecha_termino_pactada', 'date')}
          </Campo>
          <Campo label="Sueldo Bruto (CLP)" required>
            {inp('sueldo_bruto', 'number', 'Ej: 900000')}
          </Campo>
          <Campo label="Horas Semanales">
            {sel('horas_semanales', [
              { value: 45, label: '45 horas (jornada completa)' },
              { value: 30, label: '30 horas (media jornada)' },
              { value: 20, label: '20 horas' },
            ])}
          </Campo>
          <Campo label="Jornada">
            {sel('jornada', [
              { value: 'Completa', label: 'Completa' },
              { value: 'Parcial', label: 'Parcial' },
              { value: 'Excluida', label: 'Excluida (Art. 22)' },
            ])}
          </Campo>
          <Campo label="Obra">
            {sel('id_obra', obras.map(o => ({ value: o.id, label: o.nombre })))}
          </Campo>
          <Campo label="Cargo">
            {sel('id_cargo', cargos.map(c => ({ value: c.id, label: c.nombre })))}
          </Campo>
          <Campo label="Centro de Costo">
            {sel('id_centro_costo', centrosCosto.map(c => ({ value: c.id, label: `${c.codigo} — ${c.nombre}` })))}
          </Campo>
        </div>

        <div style={{display:'flex',justifyContent:'flex-end',marginTop:24}}>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Guardando…' : '✅ Guardar Contrato'}
          </button>
        </div>
      </div>
    </div>
  )
}
