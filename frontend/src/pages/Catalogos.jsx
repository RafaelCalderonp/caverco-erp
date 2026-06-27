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

const VACIO_OBRA = { nombre: '', direccion: '', comuna: '', region: 'Metropolitana' }

function PanelObras({ empresaActual }) {
  const [obras, setObras] = useState([])
  const [form, setForm] = useState(VACIO_OBRA)
  const [editando, setEditando] = useState(null)
  const [msg, setMsg] = useState('')

  const cargar = () => catalogosApi.obras().then(r => setObras(r.data)).catch(() => {})
  useEffect(() => { cargar() }, [])

  const editar = (o) => {
    setEditando(o.id)
    setForm({ nombre: o.nombre, direccion: o.direccion || '', comuna: o.comuna || '', region: o.region || 'Metropolitana' })
    setMsg('')
  }

  const cancelar = () => { setEditando(null); setForm(VACIO_OBRA); setMsg('') }

  const guardar = async (ev) => {
    ev.preventDefault()
    setMsg('')
    try {
      if (editando) {
        await catalogosApi.actualizarObra(editando, form)
      } else {
        await catalogosApi.crearObra({ ...form, id_empresa: empresaActual.id })
      }
      cancelar()
      cargar()
    } catch (err) {
      setMsg(err.response?.data?.detail || 'No se pudo guardar la obra')
    }
  }

  const desactivar = async (o) => {
    if (!confirm(`¿Desactivar la obra ${o.nombre}?`)) return
    try {
      await catalogosApi.actualizarObra(o.id, { activa: false })
      cargar()
    } catch {
      alert('No se pudo desactivar la obra')
    }
  }

  const eliminar = async (o) => {
    if (!confirm(`Esto borrará para siempre la obra ${o.nombre}. ¿Continuar?`)) return
    try {
      await catalogosApi.eliminarObra(o.id)
      cargar()
    } catch (err) {
      alert(err.response?.data?.detail || 'No se pudo eliminar la obra')
    }
  }

  return (
    <>
      <form onSubmit={guardar} className="card" style={{marginBottom:16}}>
        <h3 style={{fontWeight:600,marginBottom:12}}>{editando ? 'Editar Obra' : 'Nueva Obra'}</h3>
        {msg && <div style={{color:'var(--danger)',marginBottom:8,fontSize:13}}>{msg}</div>}
        <div className="form-grid">
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
        <div style={{display:'flex', gap:8, marginTop:8}}>
          <button className="btn btn-primary" type="submit">{editando ? 'Guardar Cambios' : '+ Agregar Obra'}</button>
          {editando && <button className="btn btn-outline" type="button" onClick={cancelar}>Cancelar</button>}
        </div>
      </form>

      <TablaSimple
        columnas={['Código','Nombre','Dirección','Comuna','Región','']}
        filas={obras}
        renderFila={o => (
          <tr key={o.id}>
            <td><span className="badge badge-blue">{o.codigo || '—'}</span></td>
            <td style={{fontWeight:500}}>{o.nombre}</td>
            <td className="text-muted">{o.direccion || '—'}</td>
            <td className="text-muted">{o.comuna || '—'}</td>
            <td className="text-muted">{o.region || '—'}</td>
            <td>
              <div className="flex items-center gap-2">
                <button className="btn btn-outline btn-sm" onClick={() => editar(o)}>Editar</button>
                <button className="btn btn-outline btn-sm" style={{color:'var(--danger)'}} onClick={() => desactivar(o)}>Desactivar</button>
                <button className="btn btn-outline btn-sm" style={{color:'var(--danger)'}} onClick={() => eliminar(o)}>Eliminar</button>
              </div>
            </td>
          </tr>
        )}
      />
    </>
  )
}

const VACIO_CARGO = { nombre: '', id_departamento: '' }

function PanelCargos({ empresaActual }) {
  const [cargos, setCargos] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [form, setForm] = useState(VACIO_CARGO)
  const [editando, setEditando] = useState(null)
  const [msg, setMsg] = useState('')

  const cargar = () => catalogosApi.cargos().then(r => setCargos(r.data)).catch(() => {})
  useEffect(() => {
    cargar()
    departamentosApi.list().then(r => setDepartamentos(r.data)).catch(() => {})
  }, [])

  const editar = (c) => {
    setEditando(c.id)
    setForm({ nombre: c.nombre, id_departamento: c.id_departamento || '' })
    setMsg('')
  }

  const cancelar = () => { setEditando(null); setForm(VACIO_CARGO); setMsg('') }

  const guardar = async (ev) => {
    ev.preventDefault()
    setMsg('')
    try {
      const payload = { ...form, id_departamento: form.id_departamento ? Number(form.id_departamento) : null }
      if (editando) {
        await catalogosApi.actualizarCargo(editando, payload)
      } else {
        await catalogosApi.crearCargo({ ...payload, id_empresa: empresaActual.id })
      }
      cancelar()
      cargar()
    } catch (err) {
      setMsg(err.response?.data?.detail || 'No se pudo guardar el cargo')
    }
  }

  const desactivar = async (c) => {
    if (!confirm(`¿Desactivar el cargo ${c.nombre}?`)) return
    try {
      await catalogosApi.actualizarCargo(c.id, { activo: false })
      cargar()
    } catch {
      alert('No se pudo desactivar el cargo')
    }
  }

  const eliminar = async (c) => {
    if (!confirm(`Esto borrará para siempre el cargo ${c.nombre}. ¿Continuar?`)) return
    try {
      await catalogosApi.eliminarCargo(c.id)
      cargar()
    } catch (err) {
      alert(err.response?.data?.detail || 'No se pudo eliminar el cargo')
    }
  }

  return (
    <>
      <form onSubmit={guardar} className="card" style={{marginBottom:16}}>
        <h3 style={{fontWeight:600,marginBottom:12}}>{editando ? 'Editar Cargo' : 'Nuevo Cargo'}</h3>
        {msg && <div style={{color:'var(--danger)',marginBottom:8,fontSize:13}}>{msg}</div>}
        <div className="form-grid">
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
        <div style={{display:'flex', gap:8, marginTop:8}}>
          <button className="btn btn-primary" type="submit">{editando ? 'Guardar Cambios' : '+ Agregar Cargo'}</button>
          {editando && <button className="btn btn-outline" type="button" onClick={cancelar}>Cancelar</button>}
        </div>
      </form>

      <TablaSimple
        columnas={['Código','Nombre','']}
        filas={cargos}
        renderFila={c => (
          <tr key={c.id}>
            <td><span className="badge badge-blue">{c.codigo}</span></td>
            <td style={{fontWeight:500}}>{c.nombre}</td>
            <td>
              <div className="flex items-center gap-2">
                <button className="btn btn-outline btn-sm" onClick={() => editar(c)}>Editar</button>
                <button className="btn btn-outline btn-sm" style={{color:'var(--danger)'}} onClick={() => desactivar(c)}>Desactivar</button>
                <button className="btn btn-outline btn-sm" style={{color:'var(--danger)'}} onClick={() => eliminar(c)}>Eliminar</button>
              </div>
            </td>
          </tr>
        )}
      />
    </>
  )
}

const VACIO_CENTRO = { codigo: '', nombre: '' }

function PanelCentrosCosto({ empresaActual }) {
  const [centros, setCentros] = useState([])
  const [form, setForm] = useState(VACIO_CENTRO)
  const [editando, setEditando] = useState(null)
  const [msg, setMsg] = useState('')

  const cargar = () => catalogosApi.centrosCosto().then(r => setCentros(r.data)).catch(() => {})
  useEffect(() => { cargar() }, [])

  const editar = (c) => {
    setEditando(c.id)
    setForm({ codigo: c.codigo, nombre: c.nombre })
    setMsg('')
  }

  const cancelar = () => { setEditando(null); setForm(VACIO_CENTRO); setMsg('') }

  const guardar = async (ev) => {
    ev.preventDefault()
    setMsg('')
    try {
      if (editando) {
        await catalogosApi.actualizarCentroCosto(editando, form)
      } else {
        await catalogosApi.crearCentroCosto({ ...form, id_empresa: empresaActual.id })
      }
      cancelar()
      cargar()
    } catch (err) {
      setMsg(err.response?.data?.detail || 'No se pudo guardar el centro de costo')
    }
  }

  const desactivar = async (c) => {
    if (!confirm(`¿Desactivar el centro de costo ${c.nombre}?`)) return
    try {
      await catalogosApi.actualizarCentroCosto(c.id, { activo: false })
      cargar()
    } catch {
      alert('No se pudo desactivar el centro de costo')
    }
  }

  const eliminar = async (c) => {
    if (!confirm(`Esto borrará para siempre el centro de costo ${c.nombre}. ¿Continuar?`)) return
    try {
      await catalogosApi.eliminarCentroCosto(c.id)
      cargar()
    } catch (err) {
      alert(err.response?.data?.detail || 'No se pudo eliminar el centro de costo')
    }
  }

  return (
    <>
      <form onSubmit={guardar} className="card" style={{marginBottom:16}}>
        <h3 style={{fontWeight:600,marginBottom:12}}>{editando ? 'Editar Centro de Costo' : 'Nuevo Centro de Costo'}</h3>
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
        <div style={{display:'flex', gap:8, marginTop:8}}>
          <button className="btn btn-primary" type="submit">{editando ? 'Guardar Cambios' : '+ Agregar Centro de Costo'}</button>
          {editando && <button className="btn btn-outline" type="button" onClick={cancelar}>Cancelar</button>}
        </div>
      </form>

      <TablaSimple
        columnas={['Código','Nombre','']}
        filas={centros}
        renderFila={c => (
          <tr key={c.id}>
            <td><span className="badge badge-blue">{c.codigo}</span></td>
            <td style={{fontWeight:500}}>{c.nombre}</td>
            <td>
              <div className="flex items-center gap-2">
                <button className="btn btn-outline btn-sm" onClick={() => editar(c)}>Editar</button>
                <button className="btn btn-outline btn-sm" style={{color:'var(--danger)'}} onClick={() => desactivar(c)}>Desactivar</button>
                <button className="btn btn-outline btn-sm" style={{color:'var(--danger)'}} onClick={() => eliminar(c)}>Eliminar</button>
              </div>
            </td>
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
        <h1>Operación</h1>
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
