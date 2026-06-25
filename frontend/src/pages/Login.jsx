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
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={onSubmit} style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2>⚙️ Caverco ERP</h2>
        <input placeholder="Usuario" value={username} onChange={e => setUsername(e.target.value)} autoFocus required />
        <input placeholder="Contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <span style={{ color: 'crimson', fontSize: 13 }}>{error}</span>}
        <button type="submit" disabled={cargando}>{cargando ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </div>
  )
}
