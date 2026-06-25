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
}

export const credencialesApi = {
  list:    (idEmpresa)            => api.get(`/empresas/${idEmpresa}/credenciales`),
  guardar: (idEmpresa, tipo, data) => api.put(`/empresas/${idEmpresa}/credenciales/${tipo}`, data),
  eliminar:(idEmpresa, tipo)      => api.delete(`/empresas/${idEmpresa}/credenciales/${tipo}`),
}
