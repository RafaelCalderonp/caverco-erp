import { useState, useEffect } from 'react'
import { usuariosApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

const ROLES = ['SUPERADMIN', 'ADMIN', 'RRHH', 'VIEWER']

const VACIO = { username: '', email: '', password: '', rol: 'VIEWER' }

export default function Usuarios() {
  const { usuario: yo } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [editando, setEditando] = useState(null) // null = lista, 'nueva' o id
  const [form, setForm] = useState(VACIO)
  const [msg, setMsg] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [resetId, setResetId] = useState(null)
  const [resetPassword, setResetPassword] = useState('')

  const cargar = () => usuariosApi.list().then(r => setUsuarios(r.data)).catch(() => {})
  useEffect(() => { cargar() }, [])

  const abrirNueva = () => { setForm(VACIO); setMsg(null); setEditando('nueva') }
  const abrirEditar = (u) => { setForm({ ...VACIO, ...u }); setMsg(null); setEditando(u.id) }
  const cerrar = () => setEditando(null)

  const setCampo = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setMsg(null)
    try {
      if (editando === 'nueva') {
        await usuariosApi.create(form)
      } else {
        await usuariosApi.update(editando, { username: form.username, email: form.email, rol: form.rol, activo: form.activo })
      }
      cargar()
      cerrar()
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Error al guardar el usuario')
    } finally {
      setGuardando(false)
    }
  }

  const toggleActivo = async (u) => {
    try {
      await usuariosApi.update(u.id, { activo: !u.activo })
      cargar()
    } catch (err) {
      alert(err.response?.data?.detail || 'No se pudo cambiar el estado')
    }
  }

  const eliminar = async (u) => {
    if (!confirm(`¿Eliminar al usuario "${u.username}"?`)) return
    try {
      await usuariosApi.delete(u.id)
      cargar()
    } catch (err) {
      alert(err.response?.data?.detail || 'No se pudo eliminar el usuario')
    }
  }

  const enviarReset = async (e) => {
    e.preventDefault()
    try {
      await usuariosApi.resetPassword(resetId, resetPassword)
      setResetId(null); setResetPassword('')
    } catch (err) {
      alert(err.response?.data?.detail || 'No se pudo resetear la contraseña')
    }
  }

  if (editando) {
    return (
      <div>
        <div className="page-header"><h1>{editando === 'nueva' ? 'Nuevo Usuario' : 'Editar Usuario'}</h1></div>
        <form onSubmit={guardar} className="card" style={{maxWidth:480}}>
          {msg && <div style={{color:'var(--danger)', fontSize:13, marginBottom:12}}>{msg}</div>}

          <div className="form-group">
            <label className="form-label">Usuario</label>
            <input className="input" required value={form.username}
              onChange={e => setCampo('username', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Correo</label>
            <input className="input" type="email" required value={form.email || ''}
              onChange={e => setCampo('email', e.target.value)} />
          </div>
          {editando === 'nueva' && (
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input className="input" type="password" required minLength={8} value={form.password}
                onChange={e => setCampo('password', e.target.value)} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Rol</label>
            <select className="select" value={form.rol} onChange={e => setCampo('rol', e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
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
        <h1>Usuarios</h1>
        <button className="btn btn-primary" onClick={abrirNueva}>+ Nuevo Usuario</button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Último login</th><th></th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map(u => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.email}</td>
              <td>{u.rol}</td>
              <td>
                <span className={`badge ${u.activo ? 'badge-green' : 'badge-gray'}`}>
                  {u.activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td>{u.ultimo_login ? new Date(u.ultimo_login).toLocaleString('es-CL') : '—'}</td>
              <td style={{display:'flex', gap:6}}>
                <button className="btn btn-outline btn-sm" onClick={() => abrirEditar(u)}>Editar</button>
                <button className="btn btn-outline btn-sm" onClick={() => { setResetId(u.id); setResetPassword('') }}>Resetear clave</button>
                {u.id !== yo?.id && (
                  <button className="btn btn-outline btn-sm" onClick={() => toggleActivo(u)}>
                    {u.activo ? 'Desactivar' : 'Activar'}
                  </button>
                )}
                {u.id !== yo?.id && (
                  <button className="btn btn-outline btn-sm" style={{color:'var(--danger)'}} onClick={() => eliminar(u)}>Eliminar</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {resetId && (
        <div className="modal-overlay" onClick={() => setResetId(null)}>
          <form className="card" style={{maxWidth:380}} onClick={e => e.stopPropagation()} onSubmit={enviarReset}>
            <h3 style={{marginBottom:12}}>Nueva contraseña</h3>
            <div className="form-group">
              <input className="input" type="password" required minLength={8} autoFocus
                placeholder="Mínimo 8 caracteres" value={resetPassword}
                onChange={e => setResetPassword(e.target.value)} />
            </div>
            <div style={{display:'flex', gap:8, marginTop:8}}>
              <button className="btn btn-primary" type="submit">Confirmar</button>
              <button className="btn btn-outline" type="button" onClick={() => setResetId(null)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
