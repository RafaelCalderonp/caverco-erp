import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { empleadosApi, departamentosApi } from '../services/api'
import api from '../services/api'
import { useEmpresa } from '../context/EmpresaContext'

// Datos catálogo (en producción vendrían de la API)
const AFPS = ['Capital','Cuprum','Habitat','PlanVital','ProVida','Modelo','Uno']
const ISAPRES = ['Fonasa','Consalud','Cruz Blanca','Nueva MasVida']
const TIPOS_CONTRATO = [
  {codigo:'INDEFINIDO', nombre:'Contrato Indefinido'},
  {codigo:'PLAZO_FIJO', nombre:'Contrato a Plazo Fijo'},
  {codigo:'POR_OBRA',   nombre:'Contrato por Obra'},
  {codigo:'HONORARIOS', nombre:'Honorarios'},
]
const REGIONES = [
  'Arica y Parinacota','Tarapacá','Antofagasta','Atacama','Coquimbo',
  'Valparaíso','Metropolitana','O\'Higgins','Maule','Ñuble',
  'Biobío','La Araucanía','Los Ríos','Los Lagos','Aysén','Magallanes',
]

const STEPS = [
  { num: 1, label: 'Datos Personales',  icon: '👤' },
  { num: 2, label: 'Datos Laborales',   icon: '💼' },
  { num: 3, label: 'Previsión Social',  icon: '🏦' },
]

const EMPTY = {
  // Paso 1
  rut: '', nombres: '', apellido_paterno: '', apellido_materno: '',
  fecha_nacimiento: '', genero: '', estado_civil: '', nacionalidad: 'Chilena',
  direccion: '', comuna: '', region: 'Metropolitana', ciudad: 'Santiago',
  telefono: '', email_personal: '', email_corporativo: '',
  // Paso 2
  codigo_interno: '', fecha_ingreso: '', sueldo_base: '',
  id_tipo_contrato: '', id_departamento: '', id_cargo: '',
  id_obra: '', id_centro_costo: '',
  // Paso 3
  id_afp: '', id_isapre: '', valor_isapre_uf: '', n_cargas: 0,
  tiene_sindicato: false,
}

function Campo({ label, required, children, span2 }) {
  return (
    <div className={`form-group${span2 ? ' span2' : ''}`}>
      <label className="form-label">{label}{required && <span style={{color:'var(--danger)'}}> *</span>}</label>
      {children}
    </div>
  )
}

export default function EmpleadoNuevo() {
  const nav = useNavigate()
  const { empresaActual } = useEmpresa()
  const [step, setStep]         = useState(1)
  const [form, setForm]         = useState(EMPTY)
  const [errors, setErrors]     = useState({})
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [departamentos, setDepartamentos] = useState([])

  useEffect(() => {
    departamentosApi.list().then(r => setDepartamentos(r.data)).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  // ── Validación por paso ───────────────────────────────────
  const validate = (s) => {
    const e = {}
    if (s === 1) {
      if (!form.rut.trim())              e.rut = 'RUT requerido'
      if (!form.nombres.trim())          e.nombres = 'Nombres requerido'
      if (!form.apellido_paterno.trim()) e.apellido_paterno = 'Apellido requerido'
    }
    if (s === 2) {
      if (!form.fecha_ingreso) e.fecha_ingreso = 'Fecha de ingreso requerida'
      if (!form.sueldo_base)   e.sueldo_base = 'Sueldo base requerido'
      if (!form.id_tipo_contrato) e.id_tipo_contrato = 'Tipo de contrato requerido'
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
      const payload = {
        ...form,
        id_empresa: empresaActual.id,
        sueldo_base: form.sueldo_base ? Number(form.sueldo_base) : null,
        n_cargas: Number(form.n_cargas),
        valor_isapre_uf: form.valor_isapre_uf ? Number(form.valor_isapre_uf) : 0,
        id_departamento: form.id_departamento ? Number(form.id_departamento) : null,
      }
      await empleadosApi.create(payload)
      nav('/empleados')
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Error al guardar el trabajador')
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
        {opts.map(o => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value??o.codigo??o.id} value={o.value??o.codigo??o.id}>{o.label??o.nombre}</option>
        )}
      </select>
      {err(k)}
    </>
  )

  return (
    <div style={{maxWidth: 800}}>
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Link to="/empleados" className="btn btn-outline btn-sm">← Volver</Link>
          <h1>Nuevo Trabajador</h1>
        </div>
      </div>

      {/* Wizard steps */}
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

        {/* ── PASO 1: Datos personales ── */}
        {step === 1 && (
          <>
            <h3 style={{fontWeight:600,marginBottom:16,color:'var(--primary)'}}>👤 Datos Personales</h3>
            <div className="form-grid">
              <Campo label="RUT" required>
                {inp('rut','text','Ej: 12.345.678-9')}
              </Campo>
              <Campo label="Código Interno">
                {inp('codigo_interno','text','Ej: 001')}
              </Campo>
              <Campo label="Nombres" required>
                {inp('nombres','text','Nombres completos')}
              </Campo>
              <Campo label="Apellido Paterno" required>
                {inp('apellido_paterno')}
              </Campo>
              <Campo label="Apellido Materno">
                {inp('apellido_materno')}
              </Campo>
              <Campo label="Fecha de Nacimiento">
                {inp('fecha_nacimiento','date')}
              </Campo>
              <Campo label="Género">
                {sel('genero',[{value:'M',label:'Masculino'},{value:'F',label:'Femenino'},{value:'O',label:'Otro'}])}
              </Campo>
              <Campo label="Estado Civil">
                {sel('estado_civil',['Soltero','Casado','Conviviente civil','Divorciado','Viudo'])}
              </Campo>
              <Campo label="Nacionalidad">
                {inp('nacionalidad','text')}
              </Campo>
              <Campo label="Teléfono">
                {inp('telefono','tel','+56 9 XXXX XXXX')}
              </Campo>
              <Campo label="Email Personal">
                {inp('email_personal','email')}
              </Campo>
              <Campo label="Email Corporativo">
                {inp('email_corporativo','email')}
              </Campo>
              <Campo label="Dirección" span2>
                {inp('direccion','text','Calle, número, departamento')}
              </Campo>
              <Campo label="Comuna">
                {inp('comuna')}
              </Campo>
              <Campo label="Ciudad">
                {inp('ciudad')}
              </Campo>
              <Campo label="Región">
                {sel('region', REGIONES)}
              </Campo>
            </div>
          </>
        )}

        {/* ── PASO 2: Datos laborales ── */}
        {step === 2 && (
          <>
            <h3 style={{fontWeight:600,marginBottom:16,color:'var(--primary)'}}>💼 Datos Laborales</h3>
            <div className="form-grid">
              <Campo label="Tipo de Contrato" required>
                {sel('id_tipo_contrato', TIPOS_CONTRATO.map(t=>({value:t.codigo,label:t.nombre})))}
              </Campo>
              <Campo label="Fecha de Ingreso" required>
                {inp('fecha_ingreso','date')}
              </Campo>
              <Campo label="Sueldo Base Bruto (CLP)" required>
                {inp('sueldo_base','number','Ej: 800000')}
              </Campo>
              <Campo label="Departamento">
                {sel('id_departamento', departamentos.map(d=>({value:d.id,label:`${d.codigo} — ${d.nombre}`})))}
              </Campo>
              <Campo label="Cargo">
                {inp('id_cargo','text','Ej: Instalador, Supervisor')}
              </Campo>
              <Campo label="Centro de Costo">
                {inp('id_centro_costo','text','Ej: E01, PERSONAL')}
              </Campo>
              <Campo label="Obra Actual">
                {inp('id_obra','text','Nombre o código de obra')}
              </Campo>
              <Campo label="Horas Semanales">
                {sel('horas_semanales',[
                  {value:45,label:'45 horas (jornada completa)'},
                  {value:30,label:'30 horas (media jornada)'},
                  {value:20,label:'20 horas'},
                ])}
              </Campo>
            </div>
          </>
        )}

        {/* ── PASO 3: Previsión social ── */}
        {step === 3 && (
          <>
            <h3 style={{fontWeight:600,marginBottom:16,color:'var(--primary)'}}>🏦 Previsión Social</h3>
            <div className="form-grid">
              <Campo label="AFP" required>
                {sel('id_afp', AFPS)}
              </Campo>
              <Campo label="Sistema de Salud" required>
                {sel('id_isapre', ISAPRES)}
              </Campo>
              <Campo label="Valor Isapre (UF)">
                <input className="input" type="number" step="0.0001"
                  placeholder="Solo si tiene Isapre (ej: 3.2)"
                  value={form.valor_isapre_uf}
                  onChange={e => set('valor_isapre_uf', e.target.value)}
                  disabled={form.id_isapre === 'Fonasa'} />
                <span style={{fontSize:11,color:'var(--gray-500)',marginTop:2,display:'block'}}>
                  Dejar en 0 si es Fonasa
                </span>
              </Campo>
              <Campo label="N° Cargas Familiares">
                <input className="input" type="number" min="0" max="20"
                  value={form.n_cargas}
                  onChange={e => set('n_cargas', e.target.value)} />
              </Campo>
              <Campo label="¿Pertenece a Sindicato?" span2>
                <div style={{display:'flex',gap:16,marginTop:4}}>
                  {[['Sí', true],['No', false]].map(([lbl, val]) => (
                    <label key={lbl} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13}}>
                      <input type="radio" name="sindicato"
                        checked={form.tiene_sindicato === val}
                        onChange={() => set('tiene_sindicato', val)} />
                      {lbl}
                    </label>
                  ))}
                </div>
              </Campo>
            </div>

            {/* Resumen antes de guardar */}
            <div style={{background:'var(--primary-bg)',border:'1px solid #bfdbfe',borderRadius:8,padding:16,marginTop:16}}>
              <h4 style={{fontWeight:600,marginBottom:10,color:'var(--primary)'}}>Resumen del trabajador</h4>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 24px',fontSize:13}}>
                {[
                  ['Nombre', `${form.nombres} ${form.apellido_paterno} ${form.apellido_materno||''}`],
                  ['RUT', form.rut],
                  ['Tipo contrato', TIPOS_CONTRATO.find(t=>t.codigo===form.id_tipo_contrato)?.nombre || '—'],
                  ['Ingreso', form.fecha_ingreso || '—'],
                  ['Sueldo base', form.sueldo_base ? `$${Number(form.sueldo_base).toLocaleString('es-CL')}` : '—'],
                  ['AFP', form.id_afp || '—'],
                  ['Salud', form.id_isapre || '—'],
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

        {/* ── Navegación wizard ── */}
        <div className="wizard-footer">
          <div>
            {step > 1 && (
              <button className="btn btn-outline" onClick={prev}>← Anterior</button>
            )}
          </div>
          <div style={{fontSize:12,color:'var(--gray-500)'}}>Paso {step} de {STEPS.length}</div>
          <div>
            {step < STEPS.length
              ? <button className="btn btn-primary" onClick={next}>Siguiente →</button>
              : <button className="btn btn-primary" onClick={submit} disabled={saving}>
                  {saving ? 'Guardando…' : '✅ Guardar Trabajador'}
                </button>
            }
          </div>
        </div>
      </div>
    </div>
  )
}
