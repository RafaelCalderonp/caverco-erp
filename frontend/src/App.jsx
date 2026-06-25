import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Empleados from './pages/Empleados'
import EmpleadoDetalle from './pages/EmpleadoDetalle'
import EmpleadoNuevo from './pages/EmpleadoNuevo'
import Departamentos from './pages/Departamentos'
import Licencias from './pages/Licencias'
import Liquidaciones from './pages/Liquidaciones'
import LiquidacionDetalle from './pages/LiquidacionDetalle'
import LiquidacionBoleta from './pages/LiquidacionBoleta'
import { useAuth } from './context/AuthContext'

function RequireAuth({ children }) {
  const { usuario, cargando } = useAuth()
  const location = useLocation()
  if (cargando) return null
  if (!usuario) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"          element={<Dashboard />} />
        <Route path="empleados"          element={<Empleados />} />
        <Route path="empleados/nuevo"    element={<EmpleadoNuevo />} />
        <Route path="empleados/:id"      element={<EmpleadoDetalle />} />
        <Route path="departamentos"      element={<Departamentos />} />
        <Route path="licencias"          element={<Licencias />} />
        <Route path="liquidaciones"      element={<Liquidaciones />} />
        <Route path="liquidaciones/:id"  element={<LiquidacionDetalle />} />
        <Route path="liquidaciones/:id/boleta" element={<LiquidacionBoleta />} />
      </Route>
    </Routes>
  )
}
