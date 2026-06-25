import axios from 'axios'

const api = axios.create({ baseURL: '/api/v1', timeout: 10000 })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
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
}

export const empleadosApi = {
  list:   (params) => api.get('/empleados', { params }),
  stats:  ()       => api.get('/empleados/stats'),
  get:    (id)     => api.get(`/empleados/${id}`),
  create: (data)   => api.post('/empleados', data),
  update: (id, d)  => api.patch(`/empleados/${id}`, d),
  delete: (id)     => api.delete(`/empleados/${id}`),
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
}

export const contratosApi = {
  list:        (params)        => api.get('/contratos', { params }),
  get:         (id)            => api.get(`/contratos/${id}`),
  create:      (data)          => api.post('/contratos', data),
  update:      (id, d)         => api.patch(`/contratos/${id}`, d),
  finiquitar:  (id, params)    => api.post(`/contratos/${id}/finiquitar`, null, { params }),
  anexos: {
    list:   (idContrato)       => api.get(`/contratos/${idContrato}/anexos`),
    create: (idContrato, d)    => api.post(`/contratos/${idContrato}/anexos`, d),
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
  cargos:         () => api.get('/catalogos/cargos'),
  centrosCosto:   () => api.get('/catalogos/centros-costo'),
}

export const credencialesApi = {
  list:    (idEmpresa)            => api.get(`/empresas/${idEmpresa}/credenciales`),
  guardar: (idEmpresa, tipo, data) => api.put(`/empresas/${idEmpresa}/credenciales/${tipo}`, data),
  eliminar:(idEmpresa, tipo)      => api.delete(`/empresas/${idEmpresa}/credenciales/${tipo}`),
}
