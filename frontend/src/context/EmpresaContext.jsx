import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { empresasApi } from '../services/api'
import { useAuth } from './AuthContext'

const EmpresaContext = createContext(null)
const STORAGE_KEY = 'empresaActualId'

export function EmpresaProvider({ children }) {
  const { usuario } = useAuth()
  const [empresas, setEmpresas] = useState([])
  const [empresaActual, setEmpresaActual] = useState(null)
  const [cargando, setCargando] = useState(true)

  const cargarEmpresas = useCallback(() => {
    setCargando(true)
    return empresasApi.list()
      .then(r => {
        const lista = r.data
        setEmpresas(lista)
        const guardadaId = Number(localStorage.getItem(STORAGE_KEY))
        const guardada = lista.find(e => e.id === guardadaId)
        if (guardada) setEmpresaActual(guardada)
        return lista
      })
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    if (usuario) cargarEmpresas()
    else { setEmpresas([]); setEmpresaActual(null); setCargando(false) }
  }, [usuario, cargarEmpresas])

  function seleccionarEmpresa(empresa) {
    localStorage.setItem(STORAGE_KEY, String(empresa.id))
    setEmpresaActual(empresa)
  }

  function salirDeEmpresa() {
    localStorage.removeItem(STORAGE_KEY)
    setEmpresaActual(null)
  }

  return (
    <EmpresaContext.Provider value={{ empresas, empresaActual, cargando, seleccionarEmpresa, salirDeEmpresa, recargarEmpresas: cargarEmpresas }}>
      {children}
    </EmpresaContext.Provider>
  )
}

export function useEmpresa() {
  return useContext(EmpresaContext)
}
