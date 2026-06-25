import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setCargando(false); return }
    authApi.me()
      .then(res => setUsuario(res.data))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setCargando(false))
  }, [])

  async function login(username, password) {
    const { data } = await authApi.login(username, password)
    localStorage.setItem('token', data.access_token)
    const { data: me } = await authApi.me()
    setUsuario(me)
  }

  function logout() {
    localStorage.removeItem('token')
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
