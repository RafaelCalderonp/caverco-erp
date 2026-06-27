import { useState, useEffect } from 'react'
import { catalogosApi, departamentosApi } from '../services/api'
import { useEmpresa } from '../context/EmpresaContext'

const REGIONES = [
  'Arica y Parinacota','Tarapacá','Antofagasta','Atacama','Coquimbo',
  'Valparaíso','Metropolitana','O\'Higgins','Maule','Ñuble',
  'Biobío','La Araucanía','Los Ríos','Los Lagos','Aysén','Magallanes',
]

const TABS = [
  { key: 'obras', label: '🏗️ Obras' },
  { key: 'cargos', label: '💼 Cargos' },
  { key: 'centros-costo', label: '💰 Centros de Costo' },
]

function TablaSimple({ columnas, filas, renderFila }) {
  return (
    <div className="card" style={{padding:0}}>
      <div className="table-wrap">
        <table>
          <thead><tr>{columnas.map(c => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {filas.length === 0 && (
              <tr><td colSpan={columnas.length} style={{textAlign:'center',padding:32,color:'var(--gray-500)'}}>Sin registros</td></tr>
            )}
            {filas.map(renderFila)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PanelObras({ empresaActual }) {
  const [obras, setObras] = useState([])
  const [form, setForm] = useState({ codigo: '', nombre: '', direccion: '', comuna: '', region: 'Metropolitana' })
  const [msg, setMsg] = useState('')

  const cargar = () => catalogosApi.obras().then(r => setObras(r.data)).catch(() => {})
  useEffect(() => { cargar() }, [])

  const crear = async (ev) => {
    ev.preventDefault()
    setMsg('')
    try {
      await catalogosApi.crearObra({ ...form, id_empresa: empresaActual.id })
      setForm({ codigo: '', nombre: '', direccion: '', comuna: '', region: 'Metropolitana' })
      cargar()
    } catch (err) {
      setMsg(err.response?.data?.detail || 'No se pudo crear la obra')
    }
  }

  return (
    <>
      <form onSubmit={crear} className="card" style={{marginBottom:16}}>
        <h3 style={{fontWeight:600,marginBottom:12}}>Nueva Obra</h3>
        {msg && <div style={{color:'var(--danger)',marginBottom:8,fontSize:13}}>{msg}</div>}
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Código</label>
            <input className="input" value={form.codigo} onChange={e=>setForm(f=>({...f,codigo:e.target.value}))} placeholder="Ej: OBR-01" />
          </div>
          <div className="form-group">
            <label className="form-label">Nombre de Obra <span style={{color:'var(--danger)'}}>*</span></label>
            <input className="input" required value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Nombre de la obra" />
          </div>
          <div className="form-group span2">
            <label className="form-label">Dirección de Obra (calle N°)</label>
            <input className="input" value={form.direccion} onChange={e=>setForm(f=>({...f,direccion:e.target.value}))} placeholder="Calle y número" />
          </div>
          <div className="form-group">
            <label className="form-label">Comuna</label>
            <input className="input" value={form.comuna} onChange={e=>setForm(f=>({...f,comuna:e.target.value}))} />
          </div>
          <div className="form-group">
            <label className="form-label">Región</label>
            <select className="select" value={form.region} onChange={e=>setForm(f=>({...f,region:e.target.value}))}>
              {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" type="submit" style={{marginTop:8}}>+ Agregar Obra</button>
      </form>

      <TablaSimple
        columnas={['Código','Nombre','Dirección','Comuna','Región']}
        filas={obras}
        renderFila={o => (
          <tr key={o.id}>
            <td><span className="badge badge-blue">{o.codigo || '—'}</span></td>
            <td style={{fontWeight:500}}>{o.nombre}</td>
            <td className="text-muted">{o.direccion || '—'}</td>
            <td className="text-muted">{o.comuna || '—'}</td>
            <td className="text-muted">{o.region || '—'}</td>
          </tr>
        )}
      />
    </>
  )
}

function PanelCargos({ empresaActual }) {
  const [cargos, setCargos] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [form, setForm] = useState({ codigo: '', nombre: '', id_departamento: '' })
  const [msg, setMsg] = useState('')

  const cargar = () => catalogosApi.cargos().then(r => setCargos(r.data)).catch(() => {})
  useEffect(() => {
    cargar()
    departamentosApi.list().then(r => setDepartamentos(r.data)).catch(() => {})
  }, [])

  const crear = async (ev) => {
    ev.preventDefault()
    setMsg('')
    try {
      await catalogosApi.crearCargo({
        ...form,
        id_empresa: empresaActual.id,
        id_departamento: form.id_departamento ? Number(form.id_departamento) : null,
      })
      setForm({ codigo: '', nombre: '', id_departamento: '' })
      cargar()
    } catch (err) {
      setMsg(err.response?.data?.detail || 'No se pudo crear el cargo')
    }
  }

  return (
    <>
      <form onSubmit={crear} className="card" style={{marginBottom:16}}>
        <h3 style={{fontWeight:600,marginBottom:12}}>Nuevo Cargo</h3>
        {msg && <div style={{color:'var(--danger)',marginBottom:8,fontSize:13}}>{msg}</div>}
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Código <span style={{color:'var(--danger)'}}>*</span></label>
            <input className="input" required value={form.codigo} onChange={e=>setForm(f=>({...f,codigo:e.target.value}))} placeholder="Ej: INST-01" />
          </div>
          <div className="form-group">
            <label className="form-label">Nombre <span style={{color:'var(--danger)'}}>*</span></label>
            <input className="input" required value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Instalador" />
          </div>
          <div className="form-group">
            <label className="form-label">Departamento</label>
            <select className="select" value={form.id_departamento} onChange={e=>setForm(f=>({...f,id_departamento:e.target.value}))}>
              <option value="">Seleccionar…</option>
              {departamentos.map(d => <option key={d.id} value={d.id}>{d.codigo} — {d.nombre}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" type="submit" style={{marginTop:8}}>+ Agregar Cargo</button>
      </form>

      <TablaSimple
        columnas={['Código','Nombre']}
        filas={cargos}
        renderFila={c => (
          <tr key={c.id}>
            <td><span className="badge badge-blue">{c.codigo}</span></td>
            <td style={{fontWeight:500}}>{c.nombre}</td>
          </tr>
        )}
      />
    </>
  )
}

function PanelCentrosCosto({ empresaActual }) {
  const [centros, setCentros] = useState([])
  const [form, setForm] = useState({ codigo: '', nombre: '' })
  const [msg, setMsg] = useState('')

  const cargar = () => catalogosApi.centrosCosto().then(r => setCentros(r.data)).catch(() => {})
  useEffect(() => { cargar() }, [])

  const crear = async (ev) => {
    ev.preventDefault()
    setMsg('')
    try {
      await catalogosApi.crearCentroCosto({ ...form, id_empresa: empresaActual.id })
      setForm({ codigo: '', nombre: '' })
      cargar()
    } catch (err) {
      setMsg(err.response?.data?.detail || 'No se pudo crear el centro de costo')
    }
  }

  return (
    <>
      <form onSubmit={crear} className="card" style={{marginBottom:16}}>
        <h3 style={{fontWeight:600,marginBottom:12}}>Nuevo Centro de Costo</h3>
        {msg && <div style={{color:'var(--danger)',marginBottom:8,fontSize:13}}>{msg}</div>}
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Código <span style={{color:'var(--danger)'}}>*</span></label>
            <input className="input" required value={form.codigo} onChange={e=>setForm(f=>({...f,codigo:e.target.value}))} placeholder="Ej: E01" />
          </div>
          <div className="form-group">
            <label className="form-label">Nombre <span style={{color:'var(--danger)'}}>*</span></label>
            <input className="input" required value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: PERSONAL" />
          </div>
        </div>
        <button className="btn btn-primary" type="submit" style={{marginTop:8}}>+ Agregar Centro de Costo</button>
      </form>

      <TablaSimple
        columnas={['Código','Nombre']}
        filas={centros}
        renderFila={c => (
          <tr key={c.id}>
            <td><span className="badge badge-blue">{c.codigo}</span></td>
            <td style={{fontWeight:500}}>{c.nombre}</td>
          </tr>
        )}
      />
    </>
  )
}

export default function Catalogos() {
  const [tab, setTab] = useState('obras')
  const { empresaActual } = useEmpresa()

  return (
    <div>
      <div className="page-header">
        <h1>Catálogos</h1>
      </div>

      <div className="wizard-steps" style={{marginBottom:16}}>
        {TABS.map(t => (
          <div key={t.key} className={`wizard-step${tab===t.key?' active':''}`} style={{cursor:'pointer'}} onClick={() => setTab(t.key)}>
            <span>{t.label}</span>
          </div>
        ))}
      </div>

      {tab === 'obras' && <PanelObras empresaActual={empresaActual} />}
      {tab === 'cargos' && <PanelCargos empresaActual={empresaActual} />}
      {tab === 'centros-costo' && <PanelCentrosCosto empresaActual={empresaActual} />}
    </div>
  )
}
