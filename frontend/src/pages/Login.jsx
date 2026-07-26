import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/caverco-logo.png'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
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
    } catch (err) {
      if (!err.response) {
        setError(
          err.code === 'ECONNABORTED'
            ? 'El servidor está despertando (puede tardar hasta 1 minuto en la primera carga tras un tiempo inactivo). Intenta de nuevo en unos segundos.'
            : 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.'
        )
      } else if (err.response.status === 401) {
        setError('Usuario o contraseña incorrectos')
      } else {
        setError(err.response.data?.detail || `Error del servidor (${err.response.status})`)
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-brand-hero">
          <div className="login-brand-logo-badge"><img src={logo} alt="Caverco Partners SpA." /></div>
          <div className="login-brand-modulos">RECURSOS HUMANOS &amp; CONTABILIDAD</div>
        </div>
        <div className="login-brand-mid">
          <h1>Gestión de personas y obras, sin complicaciones.</h1>
          <p>Contratos, anexos, licencias y liquidaciones de múltiples empresas, centralizados en una sola plataforma.</p>
        </div>
        <div className="login-brand-bottom">© {new Date().getFullYear()} Caverco Partners SpA. · Módulo RRHH</div>
      </div>

      <div className="login-side">
        <div className="login-card">
          <img className="login-card-logo" src={logo} alt="Caverco Partners SpA." />
          <h2>Caverco ERP</h2>
          <div className="sub">Ingresa con tu cuenta para continuar</div>
          <form onSubmit={onSubmit}>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Usuario</label>
              <input className="input" value={username} onChange={e => setUsername(e.target.value)} autoFocus required />
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Contraseña</label>
              <div style={{position:'relative'}}>
                <input className="input" style={{paddingRight:36}} type={verPassword ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setVerPassword(v => !v)}
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  style={{position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', fontSize:16, lineHeight:1, padding:4}}>
                  {verPassword ? '🙈' : '👁️'}
                </button>
              </div>
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
