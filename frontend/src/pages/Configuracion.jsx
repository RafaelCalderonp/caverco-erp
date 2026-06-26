import { useState, useEffect } from 'react'
import { credencialesApi, authApi } from '../services/api'

const ID_EMPRESA = 1 // app de empresa única por ahora

const TIPOS = [
  { tipo: 'PREVIRED', label: 'Previred', hint: 'Usuario y clave del portal previred.com (RUT empresa + clave).' },
  { tipo: 'CLAVE_UNICA', label: 'Clave Única (Mi DT)', hint: 'Clave Única usada para entrar al portal Mi DT y subir el Libro de Remuneraciones.' },
]

export default function Configuracion() {
  const [guardadas, setGuardadas] = useState({})
  const [forms, setForms] = useState({ PREVIRED: { usuario: '', password: '' }, CLAVE_UNICA: { usuario: '', password: '' } })
  const [msg, setMsg] = useState({})

  const [passwordForm, setPasswordForm] = useState({ actual: '', nueva: '', confirmar: '' })
  const [passwordMsg, setPasswordMsg] = useState(null)
  const [cambiandoPassword, setCambiandoPassword] = useState(false)

  const cambiarPassword = async (e) => {
    e.preventDefault()
    setPasswordMsg(null)
    if (passwordForm.nueva.length < 8) {
      return setPasswordMsg({ tipo: 'error', texto: 'La nueva contraseña debe tener al menos 8 caracteres' })
    }
    if (passwordForm.nueva !== passwordForm.confirmar) {
      return setPasswordMsg({ tipo: 'error', texto: 'Las contraseñas nuevas no coinciden' })
    }
    setCambiandoPassword(true)
    try {
      await authApi.cambiarPassword(passwordForm.actual, passwordForm.nueva)
      setPasswordForm({ actual: '', nueva: '', confirmar: '' })
      setPasswordMsg({ tipo: 'ok', texto: '✅ Contraseña actualizada' })
    } catch (err) {
      setPasswordMsg({ tipo: 'error', texto: err.response?.data?.detail || 'Error al cambiar la contraseña' })
    } finally {
      setCambiandoPassword(false)
    }
  }

  const cargar = () => {
    credencialesApi.list(ID_EMPRESA).then(r => {
      const map = {}
      r.data.forEach(c => { map[c.tipo] = c })
      setGuardadas(map)
    }).catch(() => {})
  }

  useEffect(() => { cargar() }, [])

  const setForm = (tipo, k, v) => setForms(f => ({ ...f, [tipo]: { ...f[tipo], [k]: v } }))

  const guardar = async (tipo) => {
    const data = forms[tipo]
    if (!data.usuario || !data.password) {
      return setMsg(m => ({ ...m, [tipo]: 'Completa usuario y contraseña' }))
    }
    try {
      await credencialesApi.guardar(ID_EMPRESA, tipo, data)
      setForms(f => ({ ...f, [tipo]: { usuario: '', password: '' } }))
      setMsg(m => ({ ...m, [tipo]: '✅ Guardado (cifrado)' }))
      cargar()
    } catch {
      setMsg(m => ({ ...m, [tipo]: 'Error al guardar' }))
    }
  }

  const eliminar = async (tipo) => {
    try {
      await credencialesApi.eliminar(ID_EMPRESA, tipo)
      cargar()
    } catch {
      setMsg(m => ({ ...m, [tipo]: 'Error al eliminar' }))
    }
  }

  return (
    <div>
      <div className="page-header"><h1>Configuración de la Empresa</h1></div>
      <p style={{fontSize:13, color:'var(--gray-500)', marginBottom:20, maxWidth:640}}>
        Estas credenciales se guardan <strong>cifradas</strong> únicamente como referencia para que el equipo
        sepa con qué usuario entrar. La aplicación <strong>no inicia sesión automáticamente</strong> en Previred
        ni en Mi DT — la subida de archivos siempre la haces tú, manualmente, en el portal oficial.
      </p>

      <div className="card" style={{maxWidth:420, marginBottom:24}}>
        <h3 style={{fontWeight:600, marginBottom:4}}>Mi cuenta</h3>
        <p style={{fontSize:12, color:'var(--gray-500)', marginBottom:12}}>Cambia tu contraseña de acceso al sistema.</p>

        {passwordMsg && (
          <div style={{fontSize:12, marginBottom:8, color: passwordMsg.tipo === 'ok' ? 'var(--success)' : 'var(--danger)'}}>
            {passwordMsg.texto}
          </div>
        )}

        <form onSubmit={cambiarPassword}>
          <div className="form-group">
            <label className="form-label">Contraseña actual</label>
            <input className="input" type="password" required value={passwordForm.actual}
              onChange={e => setPasswordForm(f => ({ ...f, actual: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña nueva</label>
            <input className="input" type="password" required minLength={8} value={passwordForm.nueva}
              onChange={e => setPasswordForm(f => ({ ...f, nueva: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirmar contraseña nueva</label>
            <input className="input" type="password" required minLength={8} value={passwordForm.confirmar}
              onChange={e => setPasswordForm(f => ({ ...f, confirmar: e.target.value }))} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={cambiandoPassword}>
            {cambiandoPassword ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        {TIPOS.map(({ tipo, label, hint }) => {
          const actual = guardadas[tipo]
          return (
            <div key={tipo} className="card">
              <h3 style={{fontWeight:600, marginBottom:4}}>{label}</h3>
              <p style={{fontSize:12, color:'var(--gray-500)', marginBottom:12}}>{hint}</p>

              {actual && (
                <div style={{background:'var(--gray-50)', borderRadius:6, padding:'8px 12px', marginBottom:12, fontSize:13}}>
                  <div>Usuario: <strong>{actual.usuario}</strong></div>
                  <div>Clave: <strong>{actual.password_mask}</strong></div>
                  <button className="btn btn-outline btn-sm" style={{marginTop:8}} onClick={() => eliminar(tipo)}>
                    Eliminar
                  </button>
                </div>
              )}

              {msg[tipo] && <div style={{fontSize:12, marginBottom:8, color: msg[tipo].startsWith('✅') ? 'var(--success)' : 'var(--danger)'}}>{msg[tipo]}</div>}

              <div className="form-group">
                <label className="form-label">Usuario / RUT</label>
                <input className="input" value={forms[tipo].usuario}
                  onChange={e => setForm(tipo, 'usuario', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input className="input" type="password" value={forms[tipo].password}
                  onChange={e => setForm(tipo, 'password', e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={() => guardar(tipo)}>
                {actual ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
