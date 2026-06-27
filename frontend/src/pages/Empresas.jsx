import { useState, useEffect } from 'react'
import { empresasApi } from '../services/api'
import { useEmpresa } from '../context/EmpresaContext'

const VACIO = {
  rut: '', razon_social: '', nombre_fantasia: '', direccion: '',
  contacto: '', telefono_contacto: '', email_contacto: '',
  representante_legal: '', rut_representante_legal: '', telefono: '', email: '', logo_url: '', prefijo: '',
}

export default function Empresas() {
  const { recargarEmpresas } = useEmpresa()
  const [empresas, setEmpresas] = useState([])
  const [editando, setEditando] = useState(null) // null = lista, 'nueva' o id
  const [form, setForm] = useState(VACIO)
  const [msg, setMsg] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = () => empresasApi.list().then(r => setEmpresas(r.data)).catch(() => {})
  useEffect(() => { cargar() }, [])

  const abrirNueva = () => { setForm(VACIO); setMsg(null); setEditando('nueva') }
  const abrirEditar = (emp) => { setForm({ ...VACIO, ...emp }); setMsg(null); setEditando(emp.id) }
  const cerrar = () => setEditando(null)

  const setCampo = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const onLogo = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCampo('logo_url', reader.result)
    reader.readAsDataURL(file)
  }

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setMsg(null)
    try {
      if (editando === 'nueva') {
        await empresasApi.create(form)
      } else {
        await empresasApi.update(editando, form)
      }
      cargar()
      recargarEmpresas()
      cerrar()
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Error al guardar la empresa')
    } finally {
      setGuardando(false)
    }
  }

  if (editando) {
    return (
      <div>
        <div className="page-header"><h1>{editando === 'nueva' ? 'Nueva Empresa' : 'Editar Empresa'}</h1></div>
        <form onSubmit={guardar} className="card" style={{maxWidth:560}}>
          {msg && <div style={{color:'var(--danger)', fontSize:13, marginBottom:12}}>{msg}</div>}

          <div className="form-group">
            <label className="form-label">RUT</label>
            <input className="input" required value={form.rut}
              onChange={e => setCampo('rut', e.target.value)} disabled={editando !== 'nueva'} />
          </div>
          <div className="form-group">
            <label className="form-label">Razón Social</label>
            <input className="input" required value={form.razon_social}
              onChange={e => setCampo('razon_social', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Nombre de Fantasía</label>
            <input className="input" value={form.nombre_fantasia || ''}
              onChange={e => setCampo('nombre_fantasia', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input className="input" value={form.direccion || ''}
              onChange={e => setCampo('direccion', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Teléfono Empresa</label>
            <input className="input" value={form.telefono || ''}
              onChange={e => setCampo('telefono', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Correo Empresa</label>
            <input className="input" type="email" required value={form.email || ''}
              onChange={e => setCampo('email', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Prefijo (para códigos de trabajadores, cargos y contratos)</label>
            <input className="input" maxLength={10} value={form.prefijo || ''}
              onChange={e => setCampo('prefijo', e.target.value.toUpperCase())} placeholder="Ej: INST" />
          </div>

          <h3 style={{marginTop:20, marginBottom:8, fontSize:14, color:'var(--gray-600)'}}>Contacto</h3>
          <div className="form-group">
            <label className="form-label">Nombre Contacto</label>
            <input className="input" value={form.contacto || ''}
              onChange={e => setCampo('contacto', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Teléfono Contacto</label>
            <input className="input" value={form.telefono_contacto || ''}
              onChange={e => setCampo('telefono_contacto', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Correo Contacto</label>
            <input className="input" type="email" value={form.email_contacto || ''}
              onChange={e => setCampo('email_contacto', e.target.value)} />
          </div>

          <h3 style={{marginTop:20, marginBottom:8, fontSize:14, color:'var(--gray-600)'}}>Representante Legal</h3>
          <div className="form-group">
            <label className="form-label">Representante Legal</label>
            <input className="input" required value={form.representante_legal || ''}
              onChange={e => setCampo('representante_legal', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">RUT del Representante</label>
            <input className="input" required value={form.rut_representante_legal || ''}
              onChange={e => setCampo('rut_representante_legal', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Logo (para personalizar las liquidaciones)</label>
            <input className="input" type="file" accept="image/*" onChange={onLogo} />
            {form.logo_url && (
              <img src={form.logo_url} alt="Logo" style={{maxHeight:60, marginTop:8, display:'block'}} />
            )}
          </div>

          <div style={{display:'flex', gap:8, marginTop:16}}>
            <button className="btn btn-primary" type="submit" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
            <button className="btn btn-outline" type="button" onClick={cerrar}>Cancelar</button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1>Empresas</h1>
        <button className="btn btn-primary" onClick={abrirNueva}>+ Nueva Empresa</button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>RUT</th><th>Razón Social</th><th>Representante Legal</th><th>Teléfono</th><th></th>
          </tr>
        </thead>
        <tbody>
          {empresas.map(emp => (
            <tr key={emp.id}>
              <td>{emp.rut}</td>
              <td>
                {emp.logo_url && <img src={emp.logo_url} alt="" style={{height:20, marginRight:8, verticalAlign:'middle'}} />}
                {emp.razon_social}
              </td>
              <td>{emp.representante_legal || '—'}</td>
              <td>{emp.telefono || '—'}</td>
              <td><button className="btn btn-outline btn-sm" onClick={() => abrirEditar(emp)}>Editar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
