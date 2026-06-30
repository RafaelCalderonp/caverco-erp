import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api/v1', timeout: 10000 })

const SIN_SCOPE_EMPRESA = [
  '/empresas', '/auth',
  '/catalogos/tipos-contrato', '/catalogos/motivos-termino', '/catalogos/tipos-anexo',
  '/catalogos/afp', '/catalogos/isapre',
]

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`

  const idEmpresa = localStorage.getItem('empresaActualId')
  if (idEmpresa && cfg.method === 'get' && !SIN_SCOPE_EMPRESA.some(p => cfg.url?.startsWith(p))) {
    cfg.params = { id_empresa: idEmpresa, ...cfg.params }
  }
  return cfg
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      if (!location.pathname.startsWith('/login')) location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  login: (username, password) => {
    const form = new URLSearchParams()
    form.append('username', username)
    form.append('password', password)
    return api.post('/auth/login', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  },
  me: () => api.get('/auth/me'),
  cambiarPassword: (passwordActual, passwordNueva) =>
    api.post('/auth/password', { password_actual: passwordActual, password_nueva: passwordNueva }),
}

export const usuariosApi = {
  list:   ()      => api.get('/auth/usuarios'),
  get:    (id)    => api.get(`/auth/usuarios/${id}`),
  create: (data)  => api.post('/auth/usuarios', data),
  update: (id, d) => api.patch(`/auth/usuarios/${id}`, d),
  delete: (id)    => api.delete(`/auth/usuarios/${id}`),
  resetPassword: (id, passwordNueva) => api.post(`/auth/usuarios/${id}/reset-password`, { password_nueva: passwordNueva }),
}

export const empresasApi = {
  list:   ()      => api.get('/empresas'),
  get:    (id)     => api.get(`/empresas/${id}`),
  create: (data)   => api.post('/empresas', data),
  update: (id, d)  => api.patch(`/empresas/${id}`, d),
}

export const empleadosApi = {
  list:   (params) => api.get('/empleados', { params }),
  stats:  ()       => api.get('/empleados/stats'),
  get:    (id)     => api.get(`/empleados/${id}`),
  create: (data)   => api.post('/empleados', data),
  update: (id, d)  => api.patch(`/empleados/${id}`, d),
  delete: (id)     => api.delete(`/empleados/${id}`),
  eliminarDefinitivo: (id) => api.delete(`/empleados/${id}/definitivo`),
}

export const departamentosApi = {
  list:   () => api.get('/departamentos'),
  create: (d) => api.post('/departamentos', d),
}

export const licenciasApi = {
  list:   (idEmp)     => api.get(`/empleados/${idEmp}/licencias`),
  create: (idEmp, d)  => api.post(`/empleados/${idEmp}/licencias`, d),
  update: (idEmp, id, d) => api.patch(`/empleados/${idEmp}/licencias/${id}`, d),
}

export default api

export const liquidacionesApi = {
  calcular:        (data)         => api.post('/liquidaciones/calcular', data),
  emitir:          (data)         => api.post('/liquidaciones/emitir', data),
  listarPeriodo:   (periodo, params) => api.get(`/liquidaciones/periodo/${periodo}`, { params }),
  listarEmpleado:  (idEmp)        => api.get(`/liquidaciones/empleado/${idEmp}`),
  get:             (id)           => api.get(`/liquidaciones/${id}`),
  marcarPagada:    (id)           => api.patch(`/liquidaciones/${id}/pagar`),
  indicadores:     (periodo)      => api.get(`/liquidaciones/indicadores/${periodo}`),
  exportarPrevired:            (periodo, idEmpresa) =>
    api.get(`/liquidaciones/periodo/${periodo}/export/previred`, { params: { id_empresa: idEmpresa }, responseType: 'blob' }),
  exportarLibroRemuneraciones: (periodo, idEmpresa) =>
    api.get(`/liquidaciones/periodo/${periodo}/export/libro-remuneraciones`, { params: { id_empresa: idEmpresa }, responseType: 'blob' }),
  cerrarPeriodo:   (periodo) => api.post(`/liquidaciones/periodo/${periodo}/cerrar`),
  reabrirPeriodo:  (periodo) => api.post(`/liquidaciones/periodo/${periodo}/reabrir`),
  calcularFiniquito: (data) => api.post('/liquidaciones/finiquito/calcular', data),
}

export const contratosApi = {
  list:        (params)        => api.get('/contratos', { params }),
  get:         (id)            => api.get(`/contratos/${id}`),
  create:      (data)          => api.post('/contratos', data),
  crearConTrabajador: (data)   => api.post('/contratos/con-trabajador', data),
  update:      (id, d)         => api.patch(`/contratos/${id}`, d),
  finiquitar:  (id, params)    => api.post(`/contratos/${id}/finiquitar`, null, { params }),
  descargarWord: (id)          => api.get(`/contratos/${id}/word`, { responseType: 'blob' }),
  anexos: {
    list:   (idContrato)       => api.get(`/contratos/${idContrato}/anexos`),
    create: (idContrato, d)    => api.post(`/contratos/${idContrato}/anexos`, d),
    descargarWord: (idContrato, idAnexo) => api.get(`/contratos/${idContrato}/anexos/${idAnexo}/word`, { responseType: 'blob' }),
  },
  documentos: {
    list:   (idContrato)       => api.get(`/contratos/${idContrato}/documentos`),
    create: (idContrato, d)    => api.post(`/contratos/${idContrato}/documentos`, d),
  },
  requisitosObra: {
    list:   (idContrato)       => api.get(`/contratos/${idContrato}/requisitos-obra`),
    create: (idContrato, d)    => api.post(`/contratos/${idContrato}/requisitos-obra`, d),
    update: (id, d)            => api.patch(`/contratos/requisitos-obra/${id}`, d),
  },
  entregasEpp: {
    list:   (idContrato)       => api.get(`/contratos/${idContrato}/entregas-epp`),
    create: (idContrato, d)    => api.post(`/contratos/${idContrato}/entregas-epp`, d),
  },
  pactosHorasExtra: {
    list:   (idContrato)       => api.get(`/contratos/${idContrato}/pactos-horas-extra`),
    create: (idContrato, d)    => api.post(`/contratos/${idContrato}/pactos-horas-extra`, d),
  },
}

export const catalogosApi = {
  tiposContrato:  () => api.get('/catalogos/tipos-contrato'),
  motivosTermino: () => api.get('/catalogos/motivos-termino'),
  tiposAnexo:     () => api.get('/catalogos/tipos-anexo'),
  obras:          () => api.get('/catalogos/obras'),
  crearObra:      (d) => api.post('/catalogos/obras', d),
  actualizarObra: (id, d) => api.patch(`/catalogos/obras/${id}`, d),
  eliminarObra:   (id) => api.delete(`/catalogos/obras/${id}`),
  cargos:         () => api.get('/catalogos/cargos'),
  crearCargo:      (d) => api.post('/catalogos/cargos', d),
  actualizarCargo: (id, d) => api.patch(`/catalogos/cargos/${id}`, d),
  eliminarCargo:   (id) => api.delete(`/catalogos/cargos/${id}`),
  centrosCosto:   () => api.get('/catalogos/centros-costo'),
  crearCentroCosto:      (d) => api.post('/catalogos/centros-costo', d),
  actualizarCentroCosto: (id, d) => api.patch(`/catalogos/centros-costo/${id}`, d),
  eliminarCentroCosto:   (id) => api.delete(`/catalogos/centros-costo/${id}`),
  afp:            () => api.get('/catalogos/afp'),
  isapre:         () => api.get('/catalogos/isapre'),
}

export const credencialesApi = {
  list:    (idEmpresa)            => api.get(`/empresas/${idEmpresa}/credenciales`),
  guardar: (idEmpresa, tipo, data) => api.put(`/empresas/${idEmpresa}/credenciales/${tipo}`, data),
  eliminar:(idEmpresa, tipo)      => api.delete(`/empresas/${idEmpresa}/credenciales/${tipo}`),
}

export const planCuentasApi = {
  list: () => api.get('/plan-cuentas'),
}

export const contabilidadApi = {
  listarRcv: (idEmpresa, periodo, operacion) =>
    api.get(`/empresas/${idEmpresa}/contabilidad/rcv`, { params: { periodo, operacion } }),
  importarRcv: (idEmpresa, periodo, operacion, periodoHasta) =>
    api.post(`/empresas/${idEmpresa}/contabilidad/rcv/importar`, { periodo, periodo_hasta: periodoHasta || undefined, operacion }),
  estadoImportRcv: (idEmpresa, jobId) =>
    api.get(`/empresas/${idEmpresa}/contabilidad/rcv/importar/${jobId}`),
  cargarArchivoRcv: (idEmpresa, operacion, archivos) => {
    const form = new FormData()
    form.append('operacion', operacion)
    Array.from(archivos).forEach(f => form.append('archivos', f))
    return api.post(`/empresas/${idEmpresa}/contabilidad/rcv/cargar-archivo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
