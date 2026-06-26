import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      await login(username, password)
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch {
      setError('Usuario o contraseña incorrectos')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-brand-top">Caverco Partners SpA.</div>
        <div className="login-brand-mid">
          <h1>Gestión de personas y obras, sin complicaciones.</h1>
          <p>Contratos, anexos, licencias y liquidaciones de múltiples empresas, centralizados en una sola plataforma.</p>
        </div>
        <div className="login-brand-bottom">© {new Date().getFullYear()} Caverco Partners SpA. · Módulo RRHH</div>
      </div>

      <div className="login-side">
        <div className="login-card">
          <div className="logo-mark">CV</div>
          <h2>Caverco ERP</h2>
          <div className="sub">Ingresa con tu cuenta para continuar</div>
          <form onSubmit={onSubmit}>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Usuario</label>
              <input className="input" value={username} onChange={e => setUsername(e.target.value)} autoFocus required />
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Contraseña</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <div className="login-error">{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={cargando}>
              {cargando ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
