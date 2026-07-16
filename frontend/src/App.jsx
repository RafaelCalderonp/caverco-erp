import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Empresas from './pages/Empresas'
import SeleccionarEmpresa from './pages/SeleccionarEmpresa'
import Empleados from './pages/Empleados'
import EmpleadoDetalle from './pages/EmpleadoDetalle'
import Departamentos from './pages/Departamentos'
import Licencias from './pages/Licencias'
import Catalogos from './pages/Catalogos'
import Contratos from './pages/Contratos'
import ContratoNuevo from './pages/ContratoNuevo'
import ContratoDetalle from './pages/ContratoDetalle'
import Liquidaciones from './pages/Liquidaciones'
import LiquidacionDetalle from './pages/LiquidacionDetalle'
import LiquidacionBoleta from './pages/LiquidacionBoleta'
import Contabilidad from './pages/Contabilidad'
import PlanCuentas from './pages/PlanCuentas'
import LibroDiario from './pages/LibroDiario'
import Balance8Columnas from './pages/Balance8Columnas'
import PlantillasContabilizacion from './pages/PlantillasContabilizacion'
import Capacitaciones from './pages/Capacitaciones'
import Configuracion from './pages/Configuracion'
import Usuarios from './pages/Usuarios'
import { useAuth } from './context/AuthContext'
import { useEmpresa } from './context/EmpresaContext'

function RequireAuth({ children }) {
  const { usuario, cargando } = useAuth()
  const location = useLocation()
  if (cargando) return null
  if (!usuario) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return children
}

function RequireEmpresa({ children }) {
  const { empresaActual, cargando } = useEmpresa()
  if (cargando) return null
  if (!empresaActual) return <Navigate to="/seleccionar-empresa" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"          element={<RequireEmpresa><Dashboard /></RequireEmpresa>} />
        <Route path="empresas"           element={<Empresas />} />
        <Route path="seleccionar-empresa" element={<SeleccionarEmpresa />} />
        <Route path="empleados"          element={<RequireEmpresa><Empleados /></RequireEmpresa>} />
        <Route path="empleados/nuevo"    element={<Navigate to="/contratos/nuevo" replace />} />
        <Route path="empleados/:id"      element={<RequireEmpresa><EmpleadoDetalle /></RequireEmpresa>} />
        <Route path="departamentos"      element={<RequireEmpresa><Departamentos /></RequireEmpresa>} />
        <Route path="catalogos"          element={<RequireEmpresa><Catalogos /></RequireEmpresa>} />
        <Route path="licencias"          element={<RequireEmpresa><Licencias /></RequireEmpresa>} />
        <Route path="capacitaciones"     element={<RequireEmpresa><Capacitaciones /></RequireEmpresa>} />
        <Route path="contratos"          element={<RequireEmpresa><Contratos /></RequireEmpresa>} />
        <Route path="contratos/nuevo"    element={<RequireEmpresa><ContratoNuevo /></RequireEmpresa>} />
        <Route path="contratos/:id"      element={<RequireEmpresa><ContratoDetalle /></RequireEmpresa>} />
        <Route path="liquidaciones"      element={<RequireEmpresa><Liquidaciones /></RequireEmpresa>} />
        <Route path="liquidaciones/:id"  element={<RequireEmpresa><LiquidacionDetalle /></RequireEmpresa>} />
        <Route path="liquidaciones/:id/boleta" element={<RequireEmpresa><LiquidacionBoleta /></RequireEmpresa>} />
        <Route path="contabilidad"       element={<RequireEmpresa><Contabilidad /></RequireEmpresa>} />
        <Route path="plan-cuentas"        element={<PlanCuentas />} />
        <Route path="libro-diario"        element={<RequireEmpresa><LibroDiario /></RequireEmpresa>} />
        <Route path="balance-8-columnas"       element={<RequireEmpresa><Balance8Columnas /></RequireEmpresa>} />
        <Route path="plantillas-contabilizacion" element={<RequireEmpresa><PlantillasContabilizacion /></RequireEmpresa>} />
        <Route path="configuracion"      element={<Configuracion />} />
        <Route path="usuarios"           element={<Usuarios />} />
      </Route>
    </Routes>
  )
}
