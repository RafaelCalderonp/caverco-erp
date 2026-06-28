import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { contratosApi, catalogosApi, departamentosApi } from '../services/api'
import { useEmpresa } from '../context/EmpresaContext'
import { REGIONES, COMUNAS_POR_REGION } from '../data/chile'
import { formatearRut, validarRut } from '../utils/rut'

const STEPS = [
  { num: 1, label: 'Datos del Trabajador', icon: '👤' },
  { num: 2, label: 'Datos del Contrato',   icon: '📄' },
  { num: 3, label: 'Previsión Social',     icon: '🏦' },
]

const EMPTY = {
  // Paso 1: trabajador
  rut: '', nombres: '', apellido_paterno: '', apellido_materno: '',
  fecha_nacimiento: '', genero: '', estado_civil: '', nacionalidad: 'Chilena',
  direccion: '', comuna: '', region: 'Metropolitana', ciudad: 'Santiago',
  telefono: '', email_personal: '', email_corporativo: '', id_departamento: '',
  // Paso 2: contrato
  id_tipo_contrato: '', id_obra: '', id_centro_costo: '', id_cargo: '',
  numero_contrato: '', fecha_contrato: '', fecha_inicio: '', fecha_termino_pactada: '', plazo_dias: '30',
  sueldo_bruto: '553553', horas_semanales: 42, jornada: 'Completa', horario_detalle: '',
  // Paso 3: previsión
  id_afp: '', id_isapre: '', valor_isapre_uf: '', n_cargas: 0,
  banco: '', tipo_cuenta: '', numero_cuenta: '',
}

function formatearTelefono(valor) {
  let digitos = valor.replace(/\D/g, '')
  if (digitos.startsWith('56')) digitos = digitos.slice(2)
  if (digitos.startsWith('0')) digitos = digitos.slice(1)
  if (digitos.startsWith('9') && digitos.length === 9) digitos = digitos.slice(1)
  if (digitos.length !== 8) return valor
  return `+56 9 ${digitos.slice(0, 4)} ${digitos.slice(4, 8)}`
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
  const { empresaActual } = useEmpresa()

  const [step, setStep] = useState(1)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [tiposContrato, setTiposContrato] = useState([])
  const [obras, setObras] = useState([])
  const [centrosCosto, setCentrosCosto] = useState([])
  const [cargos, setCargos] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [afps, setAfps] = useState([])
  const [isapres, setIsapres] = useState([])

  useEffect(() => {
    catalogosApi.tiposContrato().then(r => setTiposContrato(r.data)).catch(() => {})
    catalogosApi.obras().then(r => setObras(r.data)).catch(() => {})
    catalogosApi.centrosCosto().then(r => setCentrosCosto(r.data)).catch(() => {})
    catalogosApi.cargos().then(r => setCargos(r.data)).catch(() => {})
    catalogosApi.afp().then(r => setAfps(r.data)).catch(() => {})
    catalogosApi.isapre().then(r => setIsapres(r.data)).catch(() => {})
    departamentosApi.list().then(r => setDepartamentos(r.data)).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const esPlazoFijo = tiposContrato.find(t => t.id === Number(form.id_tipo_contrato))?.codigo === 'PLAZO_FIJO'

  const validate = (s) => {
    const e = {}
    if (s === 1) {
      if (!form.rut.trim())              e.rut = 'RUT requerido'
      else if (!validarRut(form.rut))    e.rut = 'RUT inválido (dígito verificador no coincide)'
      if (!form.nombres.trim())          e.nombres = 'Nombres requerido'
      if (!form.apellido_paterno.trim()) e.apellido_paterno = 'Apellido requerido'
    }
    if (s === 2) {
      if (!form.id_tipo_contrato) e.id_tipo_contrato = 'Tipo de contrato requerido'
      if (!form.fecha_contrato)   e.fecha_contrato = 'Fecha del contrato requerida'
      if (!form.fecha_inicio)     e.fecha_inicio = 'Fecha de inicio requerida'
      if (!form.sueldo_bruto)     e.sueldo_bruto = 'Sueldo bruto requerido'
    }
    if (s === 3) {
      if (!form.id_afp)    e.id_afp = 'AFP requerida'
      if (!form.id_isapre) e.id_isapre = 'Sistema de salud requerido'
    }
    return e
  }

  const next = () => {
    const e = validate(step)
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({}); setStep(s => s + 1)
  }

  const prev = () => { setErrors({}); setStep(s => s - 1) }

  const submit = async () => {
    const e = validate(3)
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true); setMsg('')
    try {
      const { plazo_dias, ...formSinPlazo } = form
      const payload = {
        ...formSinPlazo,
        id_empresa: empresaActual.id,
        fecha_nacimiento: form.fecha_nacimiento || null,
        genero: form.genero || null,
        estado_civil: form.estado_civil || null,
        id_departamento: form.id_departamento ? Number(form.id_departamento) : null,
        id_tipo_contrato: Number(form.id_tipo_contrato),
        id_obra: form.id_obra ? Number(form.id_obra) : null,
        id_centro_costo: form.id_centro_costo ? Number(form.id_centro_costo) : null,
        id_cargo: form.id_cargo ? Number(form.id_cargo) : null,
        numero_contrato: form.numero_contrato || null,
        fecha_termino_pactada: form.fecha_termino_pactada || null,
        sueldo_bruto: Number(form.sueldo_bruto),
        horas_semanales: Number(form.horas_semanales),
        horario_detalle: form.horario_detalle || null,
        id_afp: form.id_afp ? Number(form.id_afp) : null,
        id_isapre: form.id_isapre ? Number(form.id_isapre) : null,
        valor_isapre_uf: form.valor_isapre_uf ? Number(form.valor_isapre_uf) : 0,
        n_cargas: Number(form.n_cargas),
      }
      const r = await contratosApi.crearConTrabajador(payload)
      nav(`/contratos/${r.data.id_contrato}`)
    } catch (err) {
      const detalle = err.response?.data?.detail
      const texto = typeof detalle === 'string'
        ? detalle
        : Array.isArray(detalle)
          ? detalle.map(d => d.msg || JSON.stringify(d)).join(' · ')
          : 'Error al guardar el contrato'
      setMsg(texto)
    } finally { setSaving(false) }
  }

  const err = (k) => errors[k] ? (
    <span style={{fontSize:11,color:'var(--danger)',marginTop:2,display:'block'}}>{errors[k]}</span>
  ) : null

  const inp = (k, type='text', placeholder='', formatear=null) => (
    <>
      <input className={`input${errors[k]?' input-error':''}`} type={type}
        placeholder={placeholder} value={form[k]}
        onChange={e => set(k, e.target.value)}
        onBlur={formatear ? () => set(k, formatear(form[k] || '')) : undefined}
        style={errors[k]?{borderColor:'var(--danger)'}:{}} />
      {err(k)}
    </>
  )

  const sel = (k, opts, placeholder='Seleccionar…') => (
    <>
      <select className="select" value={form[k]} onChange={e => set(k, e.target.value)}
        style={errors[k]?{borderColor:'var(--danger)'}:{}}>
        <option value="">{placeholder}</option>
        {opts.map(o => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
        )}
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

      <div className="wizard-steps">
        {STEPS.map(s => (
          <div key={s.num} className={`wizard-step${step===s.num?' active':step>s.num?' done':''}`}>
            <div className="step-num">{step > s.num ? '✓' : s.num}</div>
            <span>{s.icon} {s.label}</span>
          </div>
        ))}
      </div>

      <div className="card wizard-body">
        {msg && (
          <div style={{padding:'10px 14px',borderRadius:6,marginBottom:16,background:'#fee2e2',color:'#b91c1c'}}>
            {msg}
          </div>
        )}

        {/* ── PASO 1: Datos del trabajador ── */}
        {step === 1 && (
          <>
            <h3 style={{fontWeight:600,marginBottom:16,color:'var(--primary)'}}>👤 Datos del Trabajador</h3>
            <div className="form-grid">
              <Campo label="RUT" required>{inp('rut','text','Ej: 12.345.678-9', formatearRut)}</Campo>
              <Campo label="Nombres" required>{inp('nombres','text','Nombres completos')}</Campo>
              <Campo label="Apellido Paterno" required>{inp('apellido_paterno')}</Campo>
              <Campo label="Apellido Materno">{inp('apellido_materno')}</Campo>
              <Campo label="Fecha de Nacimiento">{inp('fecha_nacimiento','date')}</Campo>
              <Campo label="Género">
                {sel('genero',[{value:'M',label:'Masculino'},{value:'F',label:'Femenino'},{value:'O',label:'Otro'}])}
              </Campo>
              <Campo label="Estado Civil">
                {sel('estado_civil',['Soltero','Casado','Conviviente civil','Divorciado','Viudo'])}
              </Campo>
              <Campo label="Nacionalidad">{inp('nacionalidad','text')}</Campo>
              <Campo label="Teléfono">{inp('telefono','tel','+56 9 XXXX XXXX', formatearTelefono)}</Campo>
              <Campo label="Email Personal">{inp('email_personal','email')}</Campo>
              <Campo label="Email Corporativo">{inp('email_corporativo','email')}</Campo>
              <Campo label="Dirección" span2>{inp('direccion','text','Calle, número, departamento')}</Campo>
              <Campo label="Región">{sel('region', REGIONES)}</Campo>
              <Campo label="Comuna">{sel('comuna', COMUNAS_POR_REGION[form.region] || [])}</Campo>
              <Campo label="Departamento">
                {sel('id_departamento', departamentos.map(d=>({value:d.id,label:`${d.codigo} — ${d.nombre}`})))}
              </Campo>
            </div>
          </>
        )}

        {/* ── PASO 2: Datos del contrato ── */}
        {step === 2 && (
          <>
            <h3 style={{fontWeight:600,marginBottom:16,color:'var(--primary)'}}>📄 Datos del Contrato</h3>
            <div className="form-grid">
              <Campo label="Tipo de Contrato" required>
                {sel('id_tipo_contrato', tiposContrato.map(t => ({ value: t.id, label: t.nombre })))}
              </Campo>
              <Campo label="Fecha del Contrato" required>{inp('fecha_contrato', 'date')}</Campo>
              <Campo label="Fecha de Inicio" required>{inp('fecha_inicio', 'date')}</Campo>
              {esPlazoFijo && (
                <Campo label="Plazo">
                  <select className="select" value={form.plazo_dias}
                    onChange={e => {
                      const dias = e.target.value
                      set('plazo_dias', dias)
                      if (dias && form.fecha_inicio) {
                        const fecha = new Date(form.fecha_inicio + 'T00:00:00')
                        fecha.setDate(fecha.getDate() + Number(dias))
                        set('fecha_termino_pactada', fecha.toISOString().slice(0, 10))
                      }
                    }}>
                    <option value="30">30 días</option>
                    <option value="60">60 días</option>
                    <option value="90">90 días</option>
                    <option value="120">120 días</option>
                  </select>
                </Campo>
              )}
              <Campo label="Fecha Término Pactada">{inp('fecha_termino_pactada', 'date')}</Campo>
              <Campo label="Sueldo Bruto (CLP)" required>{inp('sueldo_bruto', 'number', 'Ej: 900000')}</Campo>
              <Campo label="Horas Semanales">
                {sel('horas_semanales', [
                  { value: 42, label: '42 horas (jornada completa)' },
                  { value: 40, label: '40 horas' },
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
              <Campo label="Distribución del Horario" span2>
                <textarea className="input" rows={3}
                  placeholder="Ej: Lunes a Jueves de 08:00 a 18:00 horas, Viernes de 08:00 a 17:00 horas, con colación de 13:00 a 14:00 horas."
                  value={form.horario_detalle} onChange={e => set('horario_detalle', e.target.value)} />
                <span style={{fontSize:11,color:'var(--gray-500)',marginTop:2,display:'block'}}>
                  Este texto se usará tal cual en la cláusula TERCERO del contrato Word. Dejar en blanco para usar el texto genérico.
                </span>
              </Campo>
            </div>
          </>
        )}

        {/* ── PASO 3: Previsión social ── */}
        {step === 3 && (
          <>
            <h3 style={{fontWeight:600,marginBottom:16,color:'var(--primary)'}}>🏦 Previsión Social</h3>
            <div className="form-grid">
              <Campo label="AFP" required>{sel('id_afp', afps.map(a => ({ value: a.id, label: a.nombre })))}</Campo>
              <Campo label="Sistema de Salud" required>{sel('id_isapre', isapres.map(i => ({ value: i.id, label: i.nombre })))}</Campo>
              <Campo label="Valor Isapre (UF)">
                <input className="input" type="number" step="0.0001"
                  placeholder="Solo si tiene Isapre (ej: 3.2)"
                  value={form.valor_isapre_uf}
                  onChange={e => set('valor_isapre_uf', e.target.value)}
                  disabled={isapres.find(i => i.id === Number(form.id_isapre))?.es_fonasa} />
                <span style={{fontSize:11,color:'var(--gray-500)',marginTop:2,display:'block'}}>
                  Dejar en 0 si es Fonasa
                </span>
              </Campo>
              <Campo label="N° Cargas Familiares">
                <input className="input" type="number" min="0" max="20"
                  value={form.n_cargas} onChange={e => set('n_cargas', e.target.value)} />
              </Campo>
              <Campo label="Banco">{inp('banco')}</Campo>
              <Campo label="Tipo de Cuenta">
                {sel('tipo_cuenta',['Cuenta Corriente','Cuenta Vista','Cuenta de Ahorro'])}
              </Campo>
              <Campo label="N° de Cuenta">{inp('numero_cuenta')}</Campo>
            </div>

            <div style={{background:'var(--primary-bg)',border:'1px solid #bfdbfe',borderRadius:8,padding:16,marginTop:16}}>
              <h4 style={{fontWeight:600,marginBottom:10,color:'var(--primary)'}}>Resumen</h4>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 24px',fontSize:13}}>
                {[
                  ['Nombre', `${form.nombres} ${form.apellido_paterno} ${form.apellido_materno||''}`],
                  ['RUT', form.rut],
                  ['Ingreso', form.fecha_inicio || '—'],
                  ['Sueldo bruto', form.sueldo_bruto ? `$${Number(form.sueldo_bruto).toLocaleString('es-CL')}` : '—'],
                  ['AFP', afps.find(a => a.id === Number(form.id_afp))?.nombre || '—'],
                  ['Salud', isapres.find(i => i.id === Number(form.id_isapre))?.nombre || '—'],
                  ['Cargas', form.n_cargas],
                ].map(([k,v]) => (
                  <div key={k} style={{display:'flex',gap:6}}>
                    <span style={{color:'var(--gray-500)',minWidth:90}}>{k}:</span>
                    <span style={{fontWeight:500}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="wizard-footer">
          <div>
            {step > 1 && (<button className="btn btn-outline" onClick={prev}>← Anterior</button>)}
          </div>
          <div style={{fontSize:12,color:'var(--gray-500)'}}>Paso {step} de {STEPS.length}</div>
          <div>
            {step < STEPS.length
              ? <button className="btn btn-primary" onClick={next}>Siguiente →</button>
              : <button className="btn btn-primary" onClick={submit} disabled={saving}>
                  {saving ? 'Guardando…' : '✅ Generar Contrato'}
                </button>
            }
          </div>
        </div>
      </div>
    </div>
  )
}
