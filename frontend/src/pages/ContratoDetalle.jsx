import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { contratosApi, catalogosApi, liquidacionesApi, capacitacionesApi, empleadosApi } from '../services/api'
import { REGIONES, COMUNAS_POR_REGION } from '../data/chile'
import { formatearRut } from '../utils/rut'
import { calcularDiasCalendario } from '../utils/feriados'
import { HORARIO_DETALLE_DEFAULT } from './ContratoNuevo'

function Campo({ label, children, span2 }) {
  return (
    <div className={`form-group${span2 ? ' span2' : ''}`}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}

function nombreDesdeHeader(disposition, fallback) {
  // RFC 5987: filename*=UTF-8''nombre%20codificado.docx
  const rfc5987 = disposition.match(/filename\*=UTF-8''([^\s;]+)/i)
  if (rfc5987) return decodeURIComponent(rfc5987[1])
  // Formato clásico: filename="nombre.docx"
  const classic = disposition.match(/filename="?([^";\s]+)"?/i)
  if (classic) return classic[1]
  return fallback
}

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nombre
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

function sumarUnDia(fechaStr) {
  const fecha = new Date(fechaStr + 'T00:00:00')
  fecha.setDate(fecha.getDate() + 1)
  return fecha.toISOString().slice(0, 10)
}

function calcularFechaTermino(fechaInicioStr, dias) {
  const fecha = new Date(fechaInicioStr + 'T00:00:00')
  fecha.setDate(fecha.getDate() + Number(dias))
  const diaSemana = fecha.getDay()
  if (diaSemana === 6) fecha.setDate(fecha.getDate() + 2)
  else if (diaSemana === 0) fecha.setDate(fecha.getDate() + 1)
  return fecha.toISOString().slice(0, 10)
}

const PLAZOS_PRESET = [30, 60, 90, 120]

function inferirPlazoDias(fechaInicio, fechaTerminoPactada) {
  if (!fechaInicio || !fechaTerminoPactada) return ''
  for (const dias of PLAZOS_PRESET) {
    if (calcularFechaTermino(fechaInicio, dias) === fechaTerminoPactada) return String(dias)
  }
  const a = new Date(fechaInicio + 'T00:00:00')
  const b = new Date(fechaTerminoPactada + 'T00:00:00')
  const dias = Math.round((b - a) / 86400000)
  return dias > 0 ? String(dias) : ''
}

const PASOS_EDICION_CONTRATO = [
  { num: 1, label: 'Datos del Trabajador', icon: '👤' },
  { num: 2, label: 'Datos del Contrato',   icon: '📄' },
  { num: 3, label: 'Previsión Social',     icon: '🏦' },
]

export default function ContratoDetalle() {
  const { id } = useParams()
  const [contrato, setContrato] = useState(null)
  const [anexos, setAnexos] = useState([])
  const [requisitos, setRequisitos] = useState([])
  const [entregas, setEntregas] = useState([])
  const [tiposAnexo, setTiposAnexo] = useState([])
  const [obras, setObras] = useState([])
  const [cargos, setCargos] = useState([])
  const [centrosCosto, setCentrosCosto] = useState([])
  const [tiposContrato, setTiposContrato] = useState([])
  const [motivosTermino, setMotivosTermino] = useState([])
  const [afps, setAfps] = useState([])
  const [isapres, setIsapres] = useState([])
  const [topeGratifMensual, setTopeGratifMensual] = useState(213354)
  const [sueldoMinimo, setSueldoMinimo] = useState(553553)

  const [editando, setEditando] = useState(false)
  const [pasoEdicion, setPasoEdicion] = useState(1)
  const [formContrato, setFormContrato] = useState(null)
  const [guardandoContrato, setGuardandoContrato] = useState(false)
  const [cargandoEdicion, setCargandoEdicion] = useState(false)
  const [errorContrato, setErrorContrato] = useState('')
  const [mostrarFormAnexo, setMostrarFormAnexo] = useState(false)
  const [formAnexo, setFormAnexo] = useState({ id_tipo_anexo: '', fecha_anexo: '', observacion: '', plazo_dias: '30' })
  const [guardandoAnexo, setGuardandoAnexo] = useState(false)
  const [errorAnexo, setErrorAnexo] = useState('')

  const [mostrarFormRequisito, setMostrarFormRequisito] = useState(false)
  const [formRequisito, setFormRequisito] = useState({ id_obra: '', irl_ds44_folio: '', irl_ds44_fecha: '', irl_ds44_aprobada: false, fecha_ingreso_obra: '', observaciones: '' })
  const [guardandoRequisito, setGuardandoRequisito] = useState(false)
  const [errorRequisito, setErrorRequisito] = useState('')

  const EPP_DEFAULT_ITEMS = [
    { elemento: 'Casco', cantidad: 1 },
    { elemento: 'Zapatos de Seguridad', cantidad: 1 },
    { elemento: 'Guantes', cantidad: 1 },
    { elemento: 'Antiparras / Lentes de Seguridad', cantidad: 1 },
    { elemento: 'Tapones Auditivos', cantidad: 1 },
    { elemento: 'Barbiquejo', cantidad: 1 },
    { elemento: 'Bloqueador Solar', cantidad: 1 },
    { elemento: 'Chaleco Reflectante', cantidad: 1 },
    { elemento: 'Arnés de Seguridad', cantidad: 1 },
    { elemento: 'Cabo de vida simple', cantidad: 1 },
  ]

  const [mostrarFormEpp, setMostrarFormEpp] = useState(false)
  const [formEpp, setFormEpp] = useState({
    folio: '', fecha_entrega: new Date().toISOString().slice(0, 10),
    entregado_por: 'Salvador Calderón', observaciones: '',
    items: EPP_DEFAULT_ITEMS.map(i => ({ ...i })),
  })
  const [guardandoEpp, setGuardandoEpp] = useState(false)
  const [descargandoEpp, setDescargandoEpp] = useState(null)
  const [errorEpp, setErrorEpp] = useState('')

  const [fechaReglamento, setFechaReglamento] = useState(new Date().toISOString().slice(0, 10))
  const [descargandoReglamento, setDescargandoReglamento] = useState(false)

  const [ciudadCertificado, setCiudadCertificado] = useState('Santiago')
  const [fechaCertificado, setFechaCertificado] = useState(new Date().toISOString().slice(0, 10))
  const [descargandoCertificado, setDescargandoCertificado] = useState(false)

  const [formIrl, setFormIrl] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    hora_inicio: '8:30',
    hora_termino: '12:30',
    obra_nombre: '',
    obra_direccion: '',
    relator_cargo: 'Gerente General',
  })
  const [descargandoIrl, setDescargandoIrl] = useState(false)

  const MOTIVOS_AMONESTACION = [
    'Atrasos reiterados e injustificados al lugar de trabajo',
    'Ausencia injustificada al trabajo',
    'Incumplimiento del Reglamento Interno de Orden, Higiene y Seguridad',
    'Trato irrespetuoso hacia compañeros de trabajo o jefaturas',
    'Negligencia o descuido en el desempeño de sus funciones',
    'No uso de Elementos de Protección Personal (EPP) obligatorios',
    'Uso indebido de herramientas, equipos o bienes de la empresa',
    'Incumplimiento de instrucciones impartidas por el empleador',
    'Conducta inapropiada en el lugar de trabajo',
    'Daño a bienes de la empresa por dolo o negligencia',
    'Otro motivo',
  ]
  const [formAmon, setFormAmon] = useState({ motivo: '', descripcion: '', fecha: new Date().toISOString().slice(0, 10) })
  const [descargandoAmon, setDescargandoAmon] = useState(false)

  const CAUSALES_DESPIDO = [
    { grupo: 'Art. 159 – Sin responsabilidad del empleador', items: [
      { codigo: '159_1', label: 'N°1 – Mutuo acuerdo de las partes', indem: false },
      { codigo: '159_2', label: 'N°2 – Renuncia del trabajador', indem: false },
      { codigo: '159_4', label: 'N°4 – Vencimiento del plazo convenido', indem: false },
      { codigo: '159_5', label: 'N°5 – Conclusión del trabajo o servicio', indem: false },
      { codigo: '159_6', label: 'N°6 – Caso fortuito o fuerza mayor', indem: false },
    ]},
    { grupo: 'Art. 160 – Despido disciplinario (sin indemnización)', items: [
      { codigo: '160_1',  label: 'N°1 – Falta de probidad', indem: false },
      { codigo: '160_1b', label: 'N°1 letra b) – Acoso sexual', indem: false },
      { codigo: '160_1f', label: 'N°1 letra f) – Acoso laboral', indem: false },
      { codigo: '160_3',  label: 'N°3 – Ausencias injustificadas reiteradas', indem: false },
      { codigo: '160_4',  label: 'N°4 – Abandono del trabajo', indem: false },
      { codigo: '160_5',  label: 'N°5 – Actos temerarios que afecten la seguridad', indem: false },
      { codigo: '160_7',  label: 'N°7 – Incumplimiento grave de obligaciones del contrato', indem: false },
    ]},
    { grupo: 'Art. 161 – Necesidades de la empresa (con indemnización)', items: [
      { codigo: '161_1', label: 'Inciso 1° – Necesidades de la empresa', indem: true },
      { codigo: '161_2', label: 'Inciso 2° – Desahucio del empleador', indem: true },
    ]},
  ]

  // Tasas legales fijas (Art. 85 Ley 18.469 / Ley 19.728 Art. 5)
  const TASA_SALUD = 0.07
  const TASA_AFC   = 0.006

  const DESPIDO_KEY = `despido_${id}`
  const [formDespido, setFormDespido] = useState(() => {
    try {
      const saved = localStorage.getItem(`despido_${id}`)
      if (saved) return JSON.parse(saved)
    } catch {}
    return {
      causal_codigo: '', fecha_termino: '',
      aviso_con_30_dias: false,
      incluye_gratificacion: false,
      colacion_mensual: '',
      movilizacion_mensual: '',
      dias_vacaciones_tomados: 0,
      descripcion_adicional: '',
    }
  })
  const [despidoGuardado, setDespidoGuardado] = useState(() => !!localStorage.getItem(`despido_${id}`))
  const [despidoExpandido, setDespidoExpandido] = useState(() => !localStorage.getItem(`despido_${id}`))
  const [amonExpandido, setAmonExpandido] = useState(false)

  function guardarDespido() {
    localStorage.setItem(DESPIDO_KEY, JSON.stringify(formDespido))
    setDespidoGuardado(true)
    setDespidoExpandido(false)
  }

  // Auto-cargar colación/movilización del contrato solo si no hay datos guardados
  useEffect(() => {
    if (contrato && !localStorage.getItem(DESPIDO_KEY)) {
      setFormDespido(f => ({
        ...f,
        colacion_mensual: contrato.colacion || 0,
        movilizacion_mensual: contrato.movilizacion || 0,
      }))
    }
  }, [contrato])
  const [montosDespido, setMontosDespido] = useState(null)
  const [descargandoDespido, setDescargandoDespido] = useState(false)

  const [mostrarFormPacto, setMostrarFormPacto] = useState(false)
  const [formPacto, setFormPacto] = useState({ fecha_inicio: '', fecha_termino: '', tope_horas_diarias: 2, porcentaje_recargo: 0.5 })
  const [guardandoPacto, setGuardandoPacto] = useState(false)
  const [errorPacto, setErrorPacto] = useState('')
  const [pactos, setPactos] = useState([])
  const [descargandoPactoId, setDescargandoPactoId] = useState(null)

  const [formFiniquito, setFormFiniquito] = useState({ fecha_ultimo_feriado: '', procede_indemnizacion_anos_servicio: false, procede_aviso_previo: false, dias_feriado_anual: 15 })
  const [resultadoFiniquito, setResultadoFiniquito] = useState(null)
  const [calculandoFiniquito, setCalculandoFiniquito] = useState(false)
  const [errorFiniquito, setErrorFiniquito] = useState('')

  const [descargando, setDescargando] = useState(false)
  const [errorDescarga, setErrorDescarga] = useState('')
  const [descargandoAnexoId, setDescargandoAnexoId] = useState(null)

  async function descargarAnexoWord(idAnexo) {
    setDescargandoAnexoId(idAnexo)
    try {
      const r = await contratosApi.anexos.descargarWord(id, idAnexo)
      const nombre = nombreDesdeHeader(r.headers['content-disposition'] || '', `Anexo_${idAnexo}.docx`)
      descargarBlob(new Blob([r.data]), nombre)
    } catch (err) {
      alert('No se pudo generar el documento Word de este anexo')
    } finally { setDescargandoAnexoId(null) }
  }

  async function descargarWord() {
    setDescargando(true); setErrorDescarga('')
    try {
      const r = await contratosApi.descargarWord(id)
      const nombre = nombreDesdeHeader(r.headers['content-disposition'] || '', `Contrato_${id}.docx`)
      descargarBlob(new Blob([r.data]), nombre)
    } catch (err) {
      setErrorDescarga('No se pudo generar el documento Word')
    } finally { setDescargando(false) }
  }

  function cargar() {
    contratosApi.getFull(id).then(r => {
      const d = r.data
      setContrato(d)
      setAnexos(d.anexos || [])
      setRequisitos(d.requisitos_obra || [])
      setEntregas(d.entregas_epp || [])
      setPactos(d.pactos_horas_extra || [])
    }).catch(() => {
      // fallback: cargar individualmente si el endpoint no responde
      contratosApi.get(id).then(r => setContrato(r.data)).catch(() => {})
      contratosApi.anexos.list(id).then(r => setAnexos(r.data)).catch(() => {})
      contratosApi.requisitosObra.list(id).then(r => setRequisitos(r.data)).catch(() => {})
      contratosApi.entregasEpp.list(id).then(r => setEntregas(r.data)).catch(() => {})
      contratosApi.pactosHorasExtra.list(id).then(r => setPactos(r.data)).catch(() => {})
    })
  }

  useEffect(() => {
    cargar()
    catalogosApi.tiposAnexo().then(r => setTiposAnexo(r.data)).catch(() => {})
    catalogosApi.obras().then(r => setObras(r.data)).catch(() => {})
    catalogosApi.cargos().then(r => setCargos(r.data)).catch(() => {})
    catalogosApi.centrosCosto().then(r => setCentrosCosto(r.data)).catch(() => {})
    catalogosApi.tiposContrato().then(r => setTiposContrato(r.data)).catch(() => {})
    catalogosApi.motivosTermino().then(r => setMotivosTermino(r.data)).catch(() => {})
    catalogosApi.afp().then(r => setAfps(r.data)).catch(() => {})
    catalogosApi.isapre().then(r => setIsapres(r.data)).catch(() => {})
    // Tope gratificación mensual del período actual (Art. 50 CT)
    const periodo = new Date().toISOString().slice(0, 7)
    liquidacionesApi.indicadores(periodo)
      .then(r => {
        if (r.data?.tope_gratif) setTopeGratifMensual(Number(r.data.tope_gratif))
        if (r.data?.sueldo_minimo) setSueldoMinimo(Number(r.data.sueldo_minimo))
      })
      .catch(() => {})
  }, [id])

  const esPlazoFijo = tiposContrato.find(t => t.id === Number(formContrato?.id_tipo_contrato))?.codigo === 'PLAZO_FIJO'
  const esProrroga = tiposAnexo.find(t => t.id === Number(formAnexo.id_tipo_anexo))?.codigo === 'PRORROGA_PLAZO'
  const yaProrrogado = anexos.some(a => tiposAnexo.find(t => t.id === a.id_tipo_anexo)?.codigo === 'PRORROGA_PLAZO')

  const abrirEdicion = async () => {
    setErrorContrato('')
    setCargandoEdicion(true)
    try {
      const r = await empleadosApi.get(contrato.id_empleado)
      const emp = r.data
      setFormContrato({
        // ── Datos del Trabajador ──
        rut: emp.rut || '',
        nombres: emp.nombres || '',
        apellido_paterno: emp.apellido_paterno || '',
        apellido_materno: emp.apellido_materno || '',
        fecha_nacimiento: emp.fecha_nacimiento || '',
        genero: emp.genero || '',
        estado_civil: emp.estado_civil || '',
        nacionalidad: emp.nacionalidad || 'Chilena',
        telefono: emp.telefono || '',
        email_personal: emp.email_personal || '',
        email_corporativo: emp.email_corporativo || '',
        direccion: emp.direccion || '',
        region: emp.region || '',
        comuna: emp.comuna || '',
        // ── Datos del Contrato ──
        numero_contrato: contrato.numero_contrato || '',
        id_tipo_contrato: contrato.id_tipo_contrato || '',
        plazo_dias: inferirPlazoDias(contrato.fecha_inicio, contrato.fecha_termino_pactada),
        fecha_contrato: contrato.fecha_contrato || '',
        fecha_inicio: contrato.fecha_inicio || '',
        fecha_termino_pactada: contrato.fecha_termino_pactada || '',
        fecha_termino_real: contrato.fecha_termino_real || '',
        id_motivo_termino: contrato.id_motivo_termino || '',
        aviso_previo_fecha: contrato.aviso_previo_fecha || '',
        sueldo_bruto: contrato.sueldo_bruto || '',
        colacion: contrato.colacion || 0,
        movilizacion: contrato.movilizacion || 0,
        horas_semanales: contrato.horas_semanales || 42,
        jornada: contrato.jornada || 'Completa',
        horario_detalle: contrato.horario_detalle || HORARIO_DETALLE_DEFAULT,
        id_obra: contrato.id_obra || '',
        id_centro_costo: contrato.id_centro_costo || '',
        id_cargo: contrato.id_cargo || '',
        // ── Previsión Social ──
        id_afp: emp.id_afp || '',
        id_isapre: emp.id_isapre || '',
        valor_isapre_uf: emp.valor_isapre_uf || '',
        n_cargas: emp.n_cargas ?? 0,
        banco: emp.banco || '',
        tipo_cuenta: emp.tipo_cuenta || '',
        numero_cuenta: emp.numero_cuenta || '',
      })
      setPasoEdicion(1)
      setEditando(true)
    } catch (err) {
      setErrorContrato('No se pudieron cargar los datos del trabajador')
    } finally { setCargandoEdicion(false) }
  }

  const guardarContrato = async () => {
    setGuardandoContrato(true); setErrorContrato('')
    try {
      const f = formContrato
      await Promise.all([
        contratosApi.update(id, {
          numero_contrato: f.numero_contrato || null,
          id_tipo_contrato: f.id_tipo_contrato ? Number(f.id_tipo_contrato) : null,
          fecha_contrato: f.fecha_contrato || null,
          fecha_inicio: f.fecha_inicio || null,
          fecha_termino_pactada: f.fecha_termino_pactada || null,
          fecha_termino_real: f.fecha_termino_real || null,
          id_motivo_termino: f.id_motivo_termino ? Number(f.id_motivo_termino) : null,
          aviso_previo_fecha: f.aviso_previo_fecha || null,
          sueldo_bruto: Number(f.sueldo_bruto),
          colacion: Number(f.colacion) || 0,
          movilizacion: Number(f.movilizacion) || 0,
          horas_semanales: Number(f.horas_semanales),
          jornada: f.jornada,
          horario_detalle: f.horario_detalle || null,
          id_obra: f.id_obra ? Number(f.id_obra) : null,
          id_centro_costo: f.id_centro_costo ? Number(f.id_centro_costo) : null,
          id_cargo: f.id_cargo ? Number(f.id_cargo) : null,
        }),
        empleadosApi.update(contrato.id_empleado, {
          nombres: f.nombres,
          apellido_paterno: f.apellido_paterno,
          apellido_materno: f.apellido_materno || null,
          fecha_nacimiento: f.fecha_nacimiento || null,
          genero: f.genero || null,
          estado_civil: f.estado_civil || null,
          nacionalidad: f.nacionalidad || null,
          telefono: f.telefono || null,
          email_personal: f.email_personal || null,
          email_corporativo: f.email_corporativo || null,
          direccion: f.direccion || null,
          region: f.region || null,
          comuna: f.comuna || null,
          id_cargo: f.id_cargo ? Number(f.id_cargo) : null,
          id_centro_costo: f.id_centro_costo ? Number(f.id_centro_costo) : null,
          sueldo_base: f.sueldo_bruto ? Number(f.sueldo_bruto) : null,
          id_afp: f.id_afp ? Number(f.id_afp) : null,
          id_isapre: f.id_isapre ? Number(f.id_isapre) : null,
          valor_isapre_uf: f.valor_isapre_uf ? Number(f.valor_isapre_uf) : 0,
          n_cargas: Number(f.n_cargas) || 0,
          banco: f.banco || null,
          tipo_cuenta: f.tipo_cuenta || null,
          numero_cuenta: f.numero_cuenta || null,
        }),
      ])
      setEditando(false)
      cargar()
    } catch (err) {
      setErrorContrato(err.response?.data?.detail || 'Error al guardar los cambios')
    } finally { setGuardandoContrato(false) }
  }

  async function guardarAnexo() {
    if (!formAnexo.id_tipo_anexo || !formAnexo.fecha_anexo) {
      setErrorAnexo('Tipo de anexo y fecha son obligatorios')
      return
    }
    setGuardandoAnexo(true); setErrorAnexo('')
    try {
      const { plazo_dias, ...formSinPlazo } = formAnexo
      const esProrroga = tiposAnexo.find(t => t.id === Number(formAnexo.id_tipo_anexo))?.codigo === 'PRORROGA_PLAZO'
      await contratosApi.anexos.create(id, {
        ...formSinPlazo,
        id_tipo_anexo: Number(formAnexo.id_tipo_anexo),
        nueva_fecha_termino: esProrroga && formAnexo.fecha_anexo
          ? calcularFechaTermino(formAnexo.fecha_anexo, plazo_dias)
          : null,
      })
      setFormAnexo({ id_tipo_anexo: '', fecha_anexo: '', observacion: '', plazo_dias: '30' })
      setMostrarFormAnexo(false)
      cargar()
    } catch (err) {
      setErrorAnexo(err.response?.data?.detail || 'Error al guardar el anexo')
    } finally { setGuardandoAnexo(false) }
  }

  async function guardarRequisito() {
    if (!formRequisito.id_obra) {
      setErrorRequisito('Obra es obligatoria')
      return
    }
    setGuardandoRequisito(true); setErrorRequisito('')
    try {
      await contratosApi.requisitosObra.create(id, {
        ...formRequisito,
        id_obra: Number(formRequisito.id_obra),
        irl_ds44_fecha: formRequisito.irl_ds44_fecha || null,
        fecha_ingreso_obra: formRequisito.fecha_ingreso_obra || null,
      })
      setFormRequisito({ id_obra: '', irl_ds44_folio: '', irl_ds44_fecha: '', irl_ds44_aprobada: false, fecha_ingreso_obra: '', observaciones: '' })
      setMostrarFormRequisito(false)
      cargar()
    } catch (err) {
      setErrorRequisito(err.response?.data?.detail || 'Error al guardar el requisito')
    } finally { setGuardandoRequisito(false) }
  }

  async function abrirFormEpp() {
    try {
      const res = await contratosApi.entregasEpp.siguienteFolio(id)
      setFormEpp(f => ({ ...f, folio: res.data.folio }))
    } catch { /* folio queda vacío, editable */ }
    setErrorEpp('')
    setMostrarFormEpp(true)
  }

  async function guardarEpp() {
    if (!formEpp.fecha_entrega) {
      setErrorEpp('Fecha de entrega es obligatoria')
      return
    }
    setGuardandoEpp(true); setErrorEpp('')
    try {
      await contratosApi.entregasEpp.create(id, {
        folio: formEpp.folio,
        fecha_entrega: formEpp.fecha_entrega,
        entregado_por: formEpp.entregado_por,
        observaciones: formEpp.observaciones,
        items: formEpp.items.filter(i => i.elemento.trim()),
      })
      setFormEpp({
        folio: '', fecha_entrega: new Date().toISOString().slice(0, 10),
        entregado_por: 'Salvador Calderón', observaciones: '',
        items: EPP_DEFAULT_ITEMS.map(i => ({ ...i })),
      })
      setMostrarFormEpp(false)
      cargar()
    } catch (err) {
      setErrorEpp(err.response?.data?.detail || 'Error al guardar la entrega de EPP')
    } finally { setGuardandoEpp(false) }
  }

  async function descargarReglamento() {
    setDescargandoReglamento(true)
    try {
      const res = await contratosApi.reglamento.word(id, fechaReglamento)
      descargarBlob(new Blob([res.data]), nombreDesdeHeader(res.headers['content-disposition'] || '', `Reglamento_Interno_${id}.docx`))
    } catch { alert('Error al generar Word') }
    finally { setDescargandoReglamento(false) }
  }

  async function descargarCertificado() {
    setDescargandoCertificado(true)
    try {
      const res = await contratosApi.certificadoAntiguedad.word(id, ciudadCertificado, fechaCertificado)
      descargarBlob(new Blob([res.data]), nombreDesdeHeader(res.headers['content-disposition'] || '', `Certificado_Antiguedad_${id}.docx`))
    } catch { alert('Error al generar certificado') }
    finally { setDescargandoCertificado(false) }
  }

  async function descargarIrl() {
    const emp = contrato?.empleado
    if (!emp) { alert('No hay datos del trabajador'); return }
    const idEmpresa = emp.id_empresa || localStorage.getItem('empresaActualId')
    if (!idEmpresa) { alert('No se pudo determinar la empresa'); return }
    setDescargandoIrl(true)
    try {
      const nombre = `${emp.nombres} ${emp.apellido_paterno}${emp.apellido_materno ? ' ' + emp.apellido_materno : ''}`.trim()
      const res = await capacitacionesApi.irl(idEmpresa, {
        nombre_trabajador: nombre,
        rut_trabajador: emp.rut || '',
        cargo: emp.cargo_nombre || '',
        obra_nombre: formIrl.obra_nombre,
        obra_direccion: formIrl.obra_direccion,
        fecha: formIrl.fecha,
        hora_inicio: formIrl.hora_inicio,
        hora_termino: formIrl.hora_termino,
        relator_cargo: formIrl.relator_cargo,
      })
      descargarBlob(new Blob([res.data]), nombreDesdeHeader(res.headers['content-disposition'] || '', `IRL_${nombre.replace(/ /g, '_')}.docx`))
    } catch { alert('Error al generar IRL') }
    finally { setDescargandoIrl(false) }
  }

  async function descargarAmonestacion() {
    if (!formAmon.motivo) { alert('Selecciona un motivo'); return }
    setDescargandoAmon(true)
    try {
      const res = await contratosApi.amonestacion.word(id, formAmon.motivo, formAmon.descripcion, formAmon.fecha)
      descargarBlob(new Blob([res.data]), nombreDesdeHeader(res.headers['content-disposition'] || '', `Amonestacion_${id}.docx`))
    } catch { alert('Error al generar amonestación') }
    finally { setDescargandoAmon(false) }
  }

  function calcularMontosDespido() {
    if (!formDespido.causal_codigo || !formDespido.fecha_termino || !contrato?.sueldo_bruto) return
    const sueldo = Math.max(Number(contrato.sueldo_bruto), sueldoMinimo)
    const fTermino = new Date(formDespido.fecha_termino + 'T00:00:00')
    const diasMes = fTermino.getDate()
    const colacion = Number(formDespido.colacion_mensual) || 0
    const movilizacion = Number(formDespido.movilizacion_mensual) || 0

    // Gratificación mensual proporcional
    const gratifMensual = formDespido.incluye_gratificacion
      ? Math.round(Math.min(sueldo * 0.25, topeGratifMensual))
      : 0
    const gratifDia = Math.round(gratifMensual * diasMes / 30)

    // Remuneración imponible días = sueldo proporcional + gratif proporcional
    const sueldoDia = sueldo / 30
    const montoDias = Math.round(sueldoDia * diasMes) + gratifDia

    // Descuentos legales sobre imponible días (AFP + Salud 7% + AFC 0.6%)
    const afpObj = afps.find(a => a.id === contrato?.empleado?.id_afp) || null
    const tasaAfp = afpObj ? afpObj.tasa : 0.1144  // fallback Capital
    const descAfp = Math.round(montoDias * tasaAfp)
    const descSalud = Math.round(montoDias * TASA_SALUD)
    const descAfc = Math.round(montoDias * TASA_AFC)
    const totalDescuentos = descAfp + descSalud + descAfc
    const montoDiasNeto = montoDias - totalDescuentos

    // Colación + Movilización proporcional (no imponible, sin descuentos)
    const remPendiente = Math.round((colacion + movilizacion) * diasMes / 30)

    // Base para indemnizaciones = sueldo + gratif + colación + movilización
    const baseIndem = sueldo + gratifMensual + colacion + movilizacion

    // Años de servicio
    const fInicio = contrato.fecha_inicio ? new Date(contrato.fecha_inicio + 'T00:00:00') : null
    let anosCompletos = 0
    let diasTrabajados = 0
    if (fInicio) {
      diasTrabajados = (fTermino - fInicio) / (1000 * 60 * 60 * 24)
      const anos = diasTrabajados / 365.25
      anosCompletos = Math.floor(anos)
      if (anos - anosCompletos >= 0.5) anosCompletos++
      anosCompletos = Math.min(anosCompletos, 11)
    }

    // Vacaciones proporcionales
    // Días ganados = días trabajados / 365 * 15 (1.25 por mes)
    // Valor día = (sueldo + gratif) / 30
    const diasGanados = fInicio ? Math.round((diasTrabajados / 365) * 15 * 100) / 100 : 0
    const diasTomados = Number(formDespido.dias_vacaciones_tomados) || 0
    const diasPendientes = Math.max(0, Math.round((diasGanados - diasTomados) * 100) / 100)
    // Conversión a días calendario: contar días hábiles desde el día siguiente al despido
    // incluyendo feriados reales para obtener días inhábiles exactos
    const fechaPostDespido = new Date(fTermino); fechaPostDespido.setDate(fechaPostDespido.getDate() + 1)
    const { diasCalendario, diasInhabiles } = calcularDiasCalendario(
      fechaPostDespido.toISOString().slice(0, 10), diasPendientes
    )
    const valorDiaVac = (sueldo + gratifMensual) / 30
    const vacProp = Math.round(valorDiaVac * diasCalendario)

    const causalInfo = CAUSALES_DESPIDO.flatMap(g => g.items).find(c => c.codigo === formDespido.causal_codigo)
    const tieneIndem = causalInfo?.indem || false
    const indemAnos = tieneIndem ? Math.round(baseIndem * anosCompletos) : 0
    const aviso = (tieneIndem && !formDespido.aviso_con_30_dias) ? Math.round(baseIndem) : 0

    // Indemnización por tiempo servido — Art. 163 bis CT
    // Solo para 159_5 (conclusión obra/faena)
    let indemTiempoServido = 0
    if (formDespido.causal_codigo === '159_5' && fInicio) {
      const diasTot = (fTermino - fInicio) / (1000 * 60 * 60 * 24)
      const mesesRaw = diasTot / 30.4375
      const mesesEnt = Math.floor(mesesRaw)
      const fracDias = (mesesRaw - mesesEnt) * 30.4375
      const mesesConFrac = mesesEnt + (fracDias > 15 ? 1 : 0)
      indemTiempoServido = Math.round(baseIndem / 30 * 2.5 * mesesConFrac)
    }

    setMontosDespido({
      diasMes, montoDias, montoDiasNeto, remPendiente, vacProp,
      diasGanados, diasTomados, diasPendientes, diasCalendario, diasInhabiles,
      anosCompletos, indemAnos, aviso, tieneIndem, gratifMensual,
      descAfp, descSalud, descAfc, totalDescuentos, tasaAfp,
      indemTiempoServido,
      total: montoDiasNeto + remPendiente + vacProp + indemAnos + aviso + indemTiempoServido,
    })
  }

  async function descargarCartaDespido() {
    if (!formDespido.causal_codigo || !formDespido.fecha_termino) { alert('Completa causal y fecha de término'); return }
    setDescargandoDespido(true)
    try {
      const res = await contratosApi.cartaDespido.word(id, {
        causal_codigo: formDespido.causal_codigo,
        fecha_termino: formDespido.fecha_termino,
        aviso_con_30_dias: formDespido.aviso_con_30_dias,
        incluye_gratificacion: formDespido.incluye_gratificacion,
        colacion_mensual: Number(formDespido.colacion_mensual) || 0,
        movilizacion_mensual: Number(formDespido.movilizacion_mensual) || 0,
        dias_vacaciones_tomados: Number(formDespido.dias_vacaciones_tomados) || 0,
        descripcion_adicional: formDespido.descripcion_adicional,
      })
      descargarBlob(new Blob([res.data]), nombreDesdeHeader(res.headers['content-disposition'] || '', `Carta_Despido_${id}.docx`))
    } catch { alert('Error al generar carta de despido') }
    finally { setDescargandoDespido(false) }
  }

  const [descargandoFiniquito, setDescargandoFiniquito] = useState(false)
  async function descargarFiniquito() {
    if (!formDespido.causal_codigo || !formDespido.fecha_termino) { alert('Guarda primero los datos de la carta de despido'); return }
    setDescargandoFiniquito(true)
    try {
      const res = await contratosApi.finiquito.word(id, {
        causal_codigo: formDespido.causal_codigo,
        fecha_termino: formDespido.fecha_termino,
        aviso_con_30_dias: formDespido.aviso_con_30_dias,
        incluye_gratificacion: formDespido.incluye_gratificacion,
        colacion_mensual: Number(formDespido.colacion_mensual) || 0,
        movilizacion_mensual: Number(formDespido.movilizacion_mensual) || 0,
        dias_vacaciones_tomados: Number(formDespido.dias_vacaciones_tomados) || 0,
      })
      descargarBlob(new Blob([res.data]), nombreDesdeHeader(res.headers['content-disposition'] || '', `Finiquito_${id}.docx`))
    } catch { alert('Error al generar finiquito') }
    finally { setDescargandoFiniquito(false) }
  }

  async function descargarEppWord(eppId) {
    setDescargandoEpp(eppId)
    try {
      const res = await contratosApi.entregasEpp.word(id, eppId)
      descargarBlob(new Blob([res.data]), nombreDesdeHeader(res.headers['content-disposition'] || '', `EntregaEPP_${eppId}.docx`))
    } catch { alert('Error al generar Word') }
    finally { setDescargandoEpp(null) }
  }

  function abrirFormPacto() {
    setFormPacto({
      fecha_inicio: contrato?.fecha_inicio || '',
      fecha_termino: '',
      tope_horas_diarias: 2,
      porcentaje_recargo: 0.5,
    })
    setErrorPacto('')
    setMostrarFormPacto(true)
  }

  function aplicarDiasPacto(dias) {
    if (!formPacto.fecha_inicio) return
    const fecha = new Date(formPacto.fecha_inicio + 'T00:00:00')
    fecha.setDate(fecha.getDate() + Number(dias))
    const diaSemana = fecha.getDay()
    if (diaSemana === 6) fecha.setDate(fecha.getDate() + 2)
    else if (diaSemana === 0) fecha.setDate(fecha.getDate() + 1)
    setFormPacto(f => ({ ...f, fecha_termino: fecha.toISOString().slice(0, 10) }))
  }

  async function guardarPacto() {
    if (!formPacto.fecha_inicio || !formPacto.fecha_termino) {
      setErrorPacto('Fecha de inicio y término son obligatorias')
      return
    }
    setGuardandoPacto(true); setErrorPacto('')
    try {
      await contratosApi.pactosHorasExtra.create(id, {
        ...formPacto,
        tope_horas_diarias: Number(formPacto.tope_horas_diarias),
        porcentaje_recargo: Number(formPacto.porcentaje_recargo),
      })
      setMostrarFormPacto(false)
      cargar()
    } catch (err) {
      setErrorPacto(err.response?.data?.detail || 'Error al guardar el pacto de horas extra')
    } finally { setGuardandoPacto(false) }
  }

  async function descargarPactoWord(pactoId) {
    setDescargandoPactoId(pactoId)
    try {
      const res = await contratosApi.pactosHorasExtra.word(id, pactoId)
      descargarBlob(new Blob([res.data]), nombreDesdeHeader(res.headers['content-disposition'] || '', `Pacto_Horas_Extra_${pactoId}.docx`))
    } catch { alert('Error al generar Word') }
    finally { setDescargandoPactoId(null) }
  }

  async function calcularFiniquito() {
    setCalculandoFiniquito(true); setErrorFiniquito(''); setResultadoFiniquito(null)
    try {
      const r = await liquidacionesApi.calcularFiniquito({
        id_contrato: Number(id),
        fecha_ultimo_feriado: formFiniquito.fecha_ultimo_feriado || null,
        procede_indemnizacion_anos_servicio: formFiniquito.procede_indemnizacion_anos_servicio,
        procede_aviso_previo: formFiniquito.procede_aviso_previo,
        dias_feriado_anual: Number(formFiniquito.dias_feriado_anual),
      })
      setResultadoFiniquito(r.data)
    } catch (err) {
      setErrorFiniquito(err.response?.data?.detail || 'Error al calcular el finiquito')
    } finally { setCalculandoFiniquito(false) }
  }

  if (!contrato) return <div className="card">Cargando…</div>

  const fmt = (n) => n ? `$${Number(n).toLocaleString('es-CL')}` : '—'
  const ESTADO_BADGE = { vigente: 'badge-green', finiquitado: 'badge-red', anulado: 'badge-gray' }

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Link to="/contratos" className="btn btn-outline btn-sm">← Volver</Link>
          <h1>{contrato.numero_contrato || `Contrato #${contrato.id}`}</h1>
          <span className={`badge ${ESTADO_BADGE[contrato.estado] || 'badge-gray'}`}>{contrato.estado}</span>
        </div>
        <div className="flex items-center gap-2">
          {!editando && (
            <button className="btn btn-outline btn-sm" onClick={abrirEdicion} disabled={cargandoEdicion}>
              {cargandoEdicion ? 'Cargando…' : '✏️ Editar'}
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={descargarWord} disabled={descargando}>
            {descargando ? 'Generando…' : '📄 Descargar Word'}
          </button>
        </div>
      </div>
      {errorDescarga && (
        <div style={{padding:'8px 12px', borderRadius:6, marginBottom:12, background:'#fee2e2', color:'#b91c1c', fontSize:13}}>
          {errorDescarga}
        </div>
      )}

      {editando ? (
        <div className="card">
          <h3 style={{marginBottom:16, fontWeight:600}}>Editar Contrato</h3>
          {errorContrato && (
            <div style={{padding:'8px 12px', borderRadius:6, marginBottom:10, background:'#fee2e2', color:'#b91c1c', fontSize:13}}>
              {errorContrato}
            </div>
          )}

          <div className="wizard-steps">
            {PASOS_EDICION_CONTRATO.map(p => (
              <div key={p.num} className={`wizard-step${pasoEdicion===p.num?' active':pasoEdicion>p.num?' done':''}`}>
                <div className="step-num">{pasoEdicion > p.num ? '✓' : p.num}</div>
                <span>{p.icon} {p.label}</span>
              </div>
            ))}
          </div>

          <div className="wizard-body">
            {/* ── PASO 1: Datos del Trabajador ── */}
            {pasoEdicion === 1 && (
              <>
                <h4 style={{fontWeight:600,marginBottom:16,color:'var(--primary)'}}>👤 Datos del Trabajador</h4>
                <div className="form-grid">
                  <Campo label="RUT">
                    <input className="input" value={formatearRut(formContrato.rut)} disabled />
                  </Campo>
                  <Campo label="Nombres">
                    <input className="input" value={formContrato.nombres}
                      onChange={e => setFormContrato(f => ({ ...f, nombres: e.target.value }))} />
                  </Campo>
                  <Campo label="Apellido Paterno">
                    <input className="input" value={formContrato.apellido_paterno}
                      onChange={e => setFormContrato(f => ({ ...f, apellido_paterno: e.target.value }))} />
                  </Campo>
                  <Campo label="Apellido Materno">
                    <input className="input" value={formContrato.apellido_materno}
                      onChange={e => setFormContrato(f => ({ ...f, apellido_materno: e.target.value }))} />
                  </Campo>
                  <Campo label="Fecha de Nacimiento">
                    <input className="input" type="date" value={formContrato.fecha_nacimiento}
                      onChange={e => setFormContrato(f => ({ ...f, fecha_nacimiento: e.target.value }))} />
                  </Campo>
                  <Campo label="Género">
                    <select className="select" value={formContrato.genero}
                      onChange={e => setFormContrato(f => ({ ...f, genero: e.target.value }))}>
                      <option value="">Seleccionar…</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                      <option value="O">Otro</option>
                    </select>
                  </Campo>
                  <Campo label="Estado Civil">
                    <select className="select" value={formContrato.estado_civil}
                      onChange={e => setFormContrato(f => ({ ...f, estado_civil: e.target.value }))}>
                      <option value="">Seleccionar…</option>
                      {['Soltero','Casado','Conviviente civil','Divorciado','Viudo'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Nacionalidad">
                    <input className="input" value={formContrato.nacionalidad}
                      onChange={e => setFormContrato(f => ({ ...f, nacionalidad: e.target.value }))} />
                  </Campo>
                  <Campo label="Teléfono">
                    <input className="input" value={formContrato.telefono}
                      onChange={e => setFormContrato(f => ({ ...f, telefono: e.target.value }))} />
                  </Campo>
                  <Campo label="Email Personal">
                    <input className="input" type="email" value={formContrato.email_personal}
                      onChange={e => setFormContrato(f => ({ ...f, email_personal: e.target.value }))} />
                  </Campo>
                  <Campo label="Email Corporativo">
                    <input className="input" type="email" value={formContrato.email_corporativo}
                      onChange={e => setFormContrato(f => ({ ...f, email_corporativo: e.target.value }))} />
                  </Campo>
                  <Campo label="Dirección" span2>
                    <input className="input" value={formContrato.direccion}
                      onChange={e => setFormContrato(f => ({ ...f, direccion: e.target.value }))} />
                  </Campo>
                  <Campo label="Región">
                    <select className="select" value={formContrato.region}
                      onChange={e => setFormContrato(f => ({ ...f, region: e.target.value, comuna: '' }))}>
                      <option value="">Seleccionar…</option>
                      {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Comuna">
                    <select className="select" value={formContrato.comuna}
                      onChange={e => setFormContrato(f => ({ ...f, comuna: e.target.value }))}>
                      <option value="">Seleccionar…</option>
                      {(COMUNAS_POR_REGION[formContrato.region] || []).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Campo>
                </div>
              </>
            )}

            {/* ── PASO 2: Datos del Contrato ── */}
            {pasoEdicion === 2 && (
              <>
                <h4 style={{fontWeight:600,marginBottom:16,color:'var(--primary)'}}>📄 Datos del Contrato</h4>
                <div className="form-grid">
                  <Campo label="N° de Contrato">
                    <input className="input" value={formContrato.numero_contrato}
                      onChange={e => setFormContrato(f => ({ ...f, numero_contrato: e.target.value }))} />
                  </Campo>
                  <Campo label="Tipo de Contrato">
                    <select className="select" value={formContrato.id_tipo_contrato}
                      onChange={e => setFormContrato(f => ({ ...f, id_tipo_contrato: e.target.value }))}>
                      <option value="">Seleccionar…</option>
                      {tiposContrato.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Fecha del Contrato">
                    <input className="input" type="date" value={formContrato.fecha_contrato}
                      onChange={e => setFormContrato(f => ({ ...f, fecha_contrato: e.target.value }))} />
                  </Campo>
                  <Campo label="Fecha de Inicio">
                    <input className="input" type="date" value={formContrato.fecha_inicio}
                      onChange={e => {
                        const fechaInicio = e.target.value
                        setFormContrato(f => {
                          const next = { ...f, fecha_inicio: fechaInicio }
                          if (esPlazoFijo && f.plazo_dias && fechaInicio) next.fecha_termino_pactada = calcularFechaTermino(fechaInicio, f.plazo_dias)
                          return next
                        })
                      }} />
                  </Campo>
                  {esPlazoFijo && (
                    <Campo label="Plazo">
                      <select className="select" value={formContrato.plazo_dias}
                        onChange={e => {
                          const dias = e.target.value
                          setFormContrato(f => {
                            const next = { ...f, plazo_dias: dias }
                            if (dias && f.fecha_inicio) next.fecha_termino_pactada = calcularFechaTermino(f.fecha_inicio, dias)
                            return next
                          })
                        }}>
                        <option value="">Seleccionar…</option>
                        {[...new Set([...PLAZOS_PRESET, Number(formContrato.plazo_dias) || null].filter(Boolean))]
                          .sort((a, b) => a - b)
                          .map(d => <option key={d} value={d}>{d} días</option>)}
                      </select>
                    </Campo>
                  )}
                  <Campo label="Fecha Término Pactada">
                    <input className="input" type="date" value={formContrato.fecha_termino_pactada}
                      onChange={e => setFormContrato(f => ({ ...f, fecha_termino_pactada: e.target.value }))} />
                  </Campo>
                  <Campo label="Sueldo Bruto (CLP)">
                    <input className="input" type="number" value={formContrato.sueldo_bruto}
                      onChange={e => setFormContrato(f => ({ ...f, sueldo_bruto: e.target.value }))} />
                  </Campo>
                  <Campo label="Colación (CLP)">
                    <input className="input" type="number" value={formContrato.colacion}
                      onChange={e => setFormContrato(f => ({ ...f, colacion: e.target.value }))} />
                  </Campo>
                  <Campo label="Movilización (CLP)">
                    <input className="input" type="number" value={formContrato.movilizacion}
                      onChange={e => setFormContrato(f => ({ ...f, movilizacion: e.target.value }))} />
                  </Campo>
                  <Campo label="Horas Semanales">
                    <select className="select" value={formContrato.horas_semanales}
                      onChange={e => setFormContrato(f => ({ ...f, horas_semanales: e.target.value }))}>
                      {[42, 40, 30, 20].map(h => <option key={h} value={h}>{h} horas</option>)}
                    </select>
                  </Campo>
                  <Campo label="Jornada">
                    <select className="select" value={formContrato.jornada}
                      onChange={e => setFormContrato(f => ({ ...f, jornada: e.target.value }))}>
                      <option value="Completa">Completa</option>
                      <option value="Parcial">Parcial</option>
                      <option value="Excluida">Excluida (Art. 22)</option>
                    </select>
                  </Campo>
                  <Campo label="Obra">
                    <select className="select" value={formContrato.id_obra}
                      onChange={e => setFormContrato(f => ({ ...f, id_obra: e.target.value }))}>
                      <option value="">Sin asignar</option>
                      {obras.map(o => <option key={o.id} value={o.id}>{o.codigo} — {o.nombre}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Cargo">
                    <select className="select" value={formContrato.id_cargo}
                      onChange={e => setFormContrato(f => ({ ...f, id_cargo: e.target.value }))}>
                      <option value="">Sin asignar</option>
                      {cargos.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Centro de Costo">
                    <select className="select" value={formContrato.id_centro_costo}
                      onChange={e => setFormContrato(f => ({ ...f, id_centro_costo: e.target.value }))}>
                      <option value="">Sin asignar</option>
                      {centrosCosto.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Distribución del Horario" span2>
                    <textarea className="input" rows={3} value={formContrato.horario_detalle}
                      onChange={e => setFormContrato(f => ({ ...f, horario_detalle: e.target.value }))} />
                  </Campo>
                  <Campo label="Fecha Término Real">
                    <input className="input" type="date" value={formContrato.fecha_termino_real}
                      onChange={e => setFormContrato(f => ({ ...f, fecha_termino_real: e.target.value }))} />
                  </Campo>
                  <Campo label="Motivo Término">
                    <select className="select" value={formContrato.id_motivo_termino}
                      onChange={e => setFormContrato(f => ({ ...f, id_motivo_termino: e.target.value }))}>
                      <option value="">Sin asignar</option>
                      {motivosTermino.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Aviso Previo (fecha)">
                    <input className="input" type="date" value={formContrato.aviso_previo_fecha}
                      onChange={e => setFormContrato(f => ({ ...f, aviso_previo_fecha: e.target.value }))} />
                  </Campo>
                </div>
              </>
            )}

            {/* ── PASO 3: Previsión Social ── */}
            {pasoEdicion === 3 && (
              <>
                <h4 style={{fontWeight:600,marginBottom:16,color:'var(--primary)'}}>🏦 Previsión Social</h4>
                <div className="form-grid">
                  <Campo label="AFP">
                    <select className="select" value={formContrato.id_afp}
                      onChange={e => setFormContrato(f => ({ ...f, id_afp: e.target.value }))}>
                      <option value="">Seleccionar…</option>
                      {afps.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Sistema de Salud">
                    <select className="select" value={formContrato.id_isapre}
                      onChange={e => setFormContrato(f => ({ ...f, id_isapre: e.target.value }))}>
                      <option value="">Seleccionar…</option>
                      {isapres.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Valor Isapre (UF)">
                    <input className="input" type="number" step="0.0001"
                      value={formContrato.valor_isapre_uf}
                      onChange={e => setFormContrato(f => ({ ...f, valor_isapre_uf: e.target.value }))}
                      disabled={isapres.find(i => i.id === Number(formContrato.id_isapre))?.es_fonasa} />
                  </Campo>
                  <Campo label="N° Cargas Familiares">
                    <input className="input" type="number" min="0" max="20"
                      value={formContrato.n_cargas}
                      onChange={e => setFormContrato(f => ({ ...f, n_cargas: e.target.value }))} />
                  </Campo>
                  <Campo label="Banco">
                    <input className="input" value={formContrato.banco}
                      onChange={e => setFormContrato(f => ({ ...f, banco: e.target.value }))} />
                  </Campo>
                  <Campo label="Tipo de Cuenta">
                    <select className="select" value={formContrato.tipo_cuenta}
                      onChange={e => setFormContrato(f => ({ ...f, tipo_cuenta: e.target.value }))}>
                      <option value="">Seleccionar…</option>
                      {['Cuenta Corriente','Cuenta Vista','Cuenta de Ahorro'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Campo>
                  <Campo label="N° de Cuenta">
                    <input className="input" value={formContrato.numero_cuenta}
                      onChange={e => setFormContrato(f => ({ ...f, numero_cuenta: e.target.value }))} />
                  </Campo>
                </div>
              </>
            )}
          </div>

          <div className="wizard-footer">
            <div>
              {pasoEdicion > 1 && (
                <button className="btn btn-outline btn-sm" onClick={() => setPasoEdicion(p => p - 1)}>← Anterior</button>
              )}
            </div>
            <div style={{fontSize:12, color:'var(--gray-500)'}}>Paso {pasoEdicion} de {PASOS_EDICION_CONTRATO.length}</div>
            <div style={{display:'flex', gap:8}}>
              <button className="btn btn-outline btn-sm" onClick={() => setEditando(false)}>Cancelar</button>
              {pasoEdicion < PASOS_EDICION_CONTRATO.length ? (
                <button className="btn btn-primary btn-sm" onClick={() => setPasoEdicion(p => p + 1)}>Siguiente →</button>
              ) : (
                <button className="btn btn-primary btn-sm" onClick={guardarContrato} disabled={guardandoContrato}>
                  {guardandoContrato ? 'Guardando…' : 'Guardar Cambios'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        <div className="card">
          <h3 style={{marginBottom:16, fontWeight:600}}>Datos del Contrato</h3>
          {[['Empleado', contrato.empleado ? `${contrato.empleado.codigo || '#' + contrato.empleado.id} — ${contrato.empleado.nombres} ${contrato.empleado.apellido_paterno}` : `#${contrato.id_empleado}`],
            ['Teléfono', contrato.empleado?.telefono],
            ['Correo', contrato.empleado?.email_corporativo],
            ['Tipo de Contrato', tiposContrato.find(t => t.id === contrato.id_tipo_contrato)?.nombre || (contrato.id_tipo_contrato ? `#${contrato.id_tipo_contrato}` : '—')],
            ['Fecha Contrato', contrato.fecha_contrato],
            ['Fecha Inicio', contrato.fecha_inicio],
            ['Fecha Término Pactada', contrato.fecha_termino_pactada],
            ['Fecha Término Real', contrato.fecha_termino_real],
            ['Sueldo Bruto', fmt(contrato.sueldo_bruto)],
            ['Colación', fmt(contrato.colacion)],
            ['Movilización', fmt(contrato.movilizacion)],
            ['Horas Semanales', contrato.horas_semanales],
            ['Jornada', contrato.jornada]].map(([k,v]) => (
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--gray-100)'}}>
              <span className="text-muted">{k}</span><span style={{fontWeight:500}}>{v || '—'}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 style={{marginBottom:16, fontWeight:600}}>Asignación</h3>
          {[['Obra', obras.find(o => o.id === contrato.id_obra)?.nombre || (contrato.id_obra ? `#${contrato.id_obra}` : '—')],
            ['Centro de Costo', centrosCosto.find(c => c.id === contrato.id_centro_costo)?.nombre || (contrato.id_centro_costo ? `#${contrato.id_centro_costo}` : '—')],
            ['Cargo', cargos.find(c => c.id === contrato.id_cargo)?.nombre || (contrato.id_cargo ? `#${contrato.id_cargo}` : '—')],
            ['Motivo Término', motivosTermino.find(m => m.id === contrato.id_motivo_termino)?.nombre || (contrato.id_motivo_termino ? `#${contrato.id_motivo_termino}` : '—')],
            ['Aviso Previo', contrato.aviso_previo_fecha || '—']].map(([k,v]) => (
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--gray-100)'}}>
              <span className="text-muted">{k}</span><span style={{fontWeight:500}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* ── Pactos de Horas Extra ── */}
      <div className="card mt-4">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
          <h3 style={{fontWeight:600}}>Pactos de Horas Extra ({pactos.length})</h3>
          <button className="btn btn-outline btn-sm" onClick={() => mostrarFormPacto ? setMostrarFormPacto(false) : abrirFormPacto()}>
            {mostrarFormPacto ? 'Cancelar' : '+ Agregar Pacto'}
          </button>
        </div>

        {mostrarFormPacto && (
          <div style={{padding:'12px', background:'var(--gray-50)', borderRadius:8, marginBottom:12}}>
            {errorPacto && (
              <div style={{padding:'8px 12px', borderRadius:6, marginBottom:10, background:'#fee2e2', color:'#b91c1c', fontSize:13}}>
                {errorPacto}
              </div>
            )}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:10}}>
              <div className="form-group">
                <label className="form-label">Fecha Inicio<span style={{color:'var(--danger)'}}> *</span></label>
                <input className="input" type="date" value={formPacto.fecha_inicio}
                  onChange={e => setFormPacto(f => ({ ...f, fecha_inicio: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha Término<span style={{color:'var(--danger)'}}> *</span></label>
                <div style={{display:'flex', gap:6, alignItems:'center', flexWrap:'wrap'}}>
                  <input className="input" type="date" value={formPacto.fecha_termino}
                    onChange={e => setFormPacto(f => ({ ...f, fecha_termino: e.target.value }))}
                    style={{flex:1, minWidth:130}} />
                  {[30, 60, 90].map(d => (
                    <button key={d} type="button" className="btn btn-outline btn-sm"
                      onClick={() => aplicarDiasPacto(d)}
                      style={{padding:'4px 8px', fontSize:12}}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tope Horas Diarias</label>
                <input className="input" type="number" step="0.5" value={formPacto.tope_horas_diarias}
                  onChange={e => setFormPacto(f => ({ ...f, tope_horas_diarias: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Porcentaje Recargo</label>
                <input className="input" type="number" step="0.01" value={formPacto.porcentaje_recargo}
                  onChange={e => setFormPacto(f => ({ ...f, porcentaje_recargo: e.target.value }))} />
              </div>
            </div>
            <div style={{display:'flex', justifyContent:'flex-end'}}>
              <button className="btn btn-primary btn-sm" onClick={guardarPacto} disabled={guardandoPacto}>
                {guardandoPacto ? 'Guardando…' : 'Guardar Pacto'}
              </button>
            </div>
          </div>
        )}

        {pactos.length === 0
          ? <p className="text-muted">Sin pactos registrados</p>
          : pactos.map(p => (
            <div key={p.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--gray-100)'}}>
              <span style={{fontSize:13}}>
                {p.fecha_inicio} → {p.fecha_termino} — tope {p.tope_horas_diarias} hrs/día — recargo {Number(p.porcentaje_recargo) * 100}%
              </span>
              <button className="btn btn-outline btn-sm" onClick={() => descargarPactoWord(p.id)}
                disabled={descargandoPactoId === p.id} style={{marginLeft:12}}>
                {descargandoPactoId === p.id ? '...' : '📄 Word'}
              </button>
            </div>
          ))
        }
      </div>

      {/* ── Reglamento Interno ── */}
      <div className="card mt-4">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
          <h3 style={{fontWeight:600}}>Reglamento Interno</h3>
        </div>
        <p style={{fontSize:13, color:'var(--gray-600)', marginBottom:12}}>
          Genera el formulario de recepción del Reglamento Interno de Orden, Higiene y Seguridad con los datos del trabajador.
        </p>
        <div style={{display:'flex', gap:12, alignItems:'flex-end'}}>
          <div className="form-group" style={{margin:0}}>
            <label className="form-label" style={{fontSize:12}}>Fecha de entrega</label>
            <input className="input" type="date" value={fechaReglamento}
              onChange={e => setFechaReglamento(e.target.value)}
              style={{fontSize:13}} />
          </div>
          <button className="btn btn-outline btn-sm" onClick={descargarReglamento} disabled={descargandoReglamento}>
            {descargandoReglamento ? '...' : '📄 Generar Word'}
          </button>
        </div>
      </div>

      {/* ── Entrega de EPP ── */}
      <div className="card mt-4">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
          <h3 style={{fontWeight:600}}>Entrega de EPP ({entregas.length})</h3>
          <button className="btn btn-outline btn-sm"
            onClick={() => mostrarFormEpp ? setMostrarFormEpp(false) : abrirFormEpp()}>
            {mostrarFormEpp ? 'Cancelar' : '+ Agregar Entrega'}
          </button>
        </div>

        {mostrarFormEpp && (
          <div style={{padding:'16px', background:'var(--gray-50)', borderRadius:8, marginBottom:16}}>
            {errorEpp && (
              <div style={{padding:'8px 12px', borderRadius:6, marginBottom:10, background:'#fee2e2', color:'#b91c1c', fontSize:13}}>
                {errorEpp}
              </div>
            )}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12}}>
              <div className="form-group">
                <label className="form-label">Fecha de Entrega *</label>
                <input className="input" type="date" value={formEpp.fecha_entrega}
                  onChange={e => setFormEpp(f => ({ ...f, fecha_entrega: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Folio</label>
                <input className="input" type="text" value={formEpp.folio}
                  onChange={e => setFormEpp(f => ({ ...f, folio: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Entregado por</label>
                <input className="input" type="text" value={formEpp.entregado_por}
                  onChange={e => setFormEpp(f => ({ ...f, entregado_por: e.target.value }))} />
              </div>
            </div>

            <div style={{marginBottom:12}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
                <label className="form-label" style={{margin:0, fontWeight:600}}>Elementos EPP</label>
                <button type="button" className="btn btn-outline btn-sm"
                  onClick={() => setFormEpp(f => ({ ...f, items: [...f.items, { elemento: '', cantidad: 1 }] }))}>
                  + Agregar elemento
                </button>
              </div>
              <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                <thead>
                  <tr style={{background:'var(--gray-100)'}}>
                    <th style={{padding:'4px 8px', textAlign:'left'}}>Elemento</th>
                    <th style={{padding:'4px 8px', textAlign:'center', width:90}}>Cantidad</th>
                    <th style={{width:36}}></th>
                  </tr>
                </thead>
                <tbody>
                  {formEpp.items.map((item, idx) => (
                    <tr key={idx} style={{borderBottom:'1px solid var(--gray-200)'}}>
                      <td style={{padding:'3px 4px'}}>
                        <input type="text" value={item.elemento}
                          onChange={e => setFormEpp(f => {
                            const arr = [...f.items]; arr[idx] = { ...arr[idx], elemento: e.target.value }; return { ...f, items: arr }
                          })}
                          style={{width:'100%', border:'1px solid var(--gray-300)', borderRadius:4, padding:'2px 6px', fontSize:12}} />
                      </td>
                      <td style={{padding:'3px 4px'}}>
                        <input type="number" min="1" value={item.cantidad}
                          onChange={e => setFormEpp(f => {
                            const arr = [...f.items]; arr[idx] = { ...arr[idx], cantidad: Number(e.target.value) || 1 }; return { ...f, items: arr }
                          })}
                          style={{width:'100%', border:'1px solid var(--gray-300)', borderRadius:4, padding:'2px 6px', fontSize:12, textAlign:'center'}} />
                      </td>
                      <td style={{padding:'3px 8px', textAlign:'center'}}>
                        <button type="button"
                          onClick={() => setFormEpp(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}
                          style={{background:'none', border:'none', color:'var(--danger)', cursor:'pointer', fontSize:16, lineHeight:1}}>
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form-group" style={{marginBottom:12}}>
              <label className="form-label">Observaciones</label>
              <textarea className="input" rows={2} value={formEpp.observaciones}
                onChange={e => setFormEpp(f => ({ ...f, observaciones: e.target.value }))} />
            </div>

            <div style={{display:'flex', justifyContent:'flex-end'}}>
              <button className="btn btn-primary btn-sm" onClick={guardarEpp} disabled={guardandoEpp}>
                {guardandoEpp ? 'Guardando…' : 'Guardar Entrega'}
              </button>
            </div>
          </div>
        )}

        {entregas.length === 0
          ? <p className="text-muted">Sin entregas registradas</p>
          : entregas.map(e => (
            <div key={e.id} style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'10px 0', borderBottom:'1px solid var(--gray-100)',
            }}>
              <div style={{fontSize:13}}>
                <strong>Folio {e.folio || '—'}</strong>
                <span style={{marginLeft:12, color:'var(--gray-600)'}}>{e.fecha_entrega}</span>
                <span style={{marginLeft:12, color:'var(--gray-500)'}}>
                  {(e.items || []).length} elemento{(e.items || []).length !== 1 ? 's' : ''}
                </span>
                {e.entregado_por && (
                  <span style={{marginLeft:12, color:'var(--gray-500)'}}>— {e.entregado_por}</span>
                )}
              </div>
              <button className="btn btn-outline btn-sm" disabled={descargandoEpp === e.id}
                onClick={() => descargarEppWord(e.id)}>
                {descargandoEpp === e.id ? '...' : '📄 Word'}
              </button>
            </div>
          ))
        }
      </div>

      {/* ── IRL (Información de Riesgos Laborales - Art. 15 DS44) ── */}
      <div className="card mt-4">
        <h3 style={{fontWeight:600, marginBottom:12}}>IRL — Información de Riesgos Laborales (Art. 15 DS44)</h3>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10}}>
          <div>
            <label className="form-label">Fecha</label>
            <input className="form-control" type="date" value={formIrl.fecha}
              onChange={e => setFormIrl(f => ({...f, fecha: e.target.value}))} />
          </div>
          <div>
            <label className="form-label">Hora Inicio</label>
            <input className="form-control" type="text" value={formIrl.hora_inicio}
              onChange={e => setFormIrl(f => ({...f, hora_inicio: e.target.value}))} />
          </div>
          <div>
            <label className="form-label">Hora Término</label>
            <input className="form-control" type="text" value={formIrl.hora_termino}
              onChange={e => setFormIrl(f => ({...f, hora_termino: e.target.value}))} />
          </div>
          <div>
            <label className="form-label">Cargo Relator</label>
            <input className="form-control" type="text" value={formIrl.relator_cargo}
              onChange={e => setFormIrl(f => ({...f, relator_cargo: e.target.value}))} />
          </div>
          <div style={{gridColumn:'1 / -1'}}>
            <label className="form-label">Obra / Proyecto</label>
            <select className="form-control" value={formIrl.obra_nombre}
              onChange={e => {
                const obra = obras.find(o => o.nombre === e.target.value)
                setFormIrl(f => ({...f, obra_nombre: e.target.value, obra_direccion: obra?.direccion || ''}))
              }}>
              <option value="">— Seleccionar obra —</option>
              {obras.map(o => <option key={o.id} value={o.nombre}>{o.codigo ? `${o.codigo} — ` : ''}{o.nombre}</option>)}
            </select>
          </div>
          <div style={{gridColumn:'1 / -1'}}>
            <label className="form-label">Dirección Obra</label>
            <input className="form-control" type="text" value={formIrl.obra_direccion}
              onChange={e => setFormIrl(f => ({...f, obra_direccion: e.target.value}))} />
          </div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={descargarIrl} disabled={descargandoIrl}>
          {descargandoIrl ? 'Generando…' : '📄 Generar IRL Word'}
        </button>
      </div>

      {/* ── Anexos ── */}
      <div className="card mt-4">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
          <h3 style={{fontWeight:600}}>Anexos ({anexos.length})</h3>
          <button className="btn btn-outline btn-sm" onClick={() => { setMostrarFormAnexo(v => !v); setErrorAnexo('') }}>
            {mostrarFormAnexo ? 'Cancelar' : '+ Agregar Anexo'}
          </button>
        </div>

        {mostrarFormAnexo && (
          <div style={{padding:'12px', background:'var(--gray-50)', borderRadius:8, marginBottom:12}}>
            {errorAnexo && (
              <div style={{padding:'8px 12px', borderRadius:6, marginBottom:10, background:'#fee2e2', color:'#b91c1c', fontSize:13}}>
                {errorAnexo}
              </div>
            )}
            {yaProrrogado && (
              <div style={{padding:'8px 12px', borderRadius:6, marginBottom:10, background:'#fef3c7', color:'#92400e', fontSize:13}}>
                Este contrato ya tiene una prórroga registrada. El próximo anexo debe ser de Conversión a Indefinido.
              </div>
            )}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:10}}>
              <div className="form-group">
                <label className="form-label">Tipo de Anexo<span style={{color:'var(--danger)'}}> *</span></label>
                <select className="select" value={formAnexo.id_tipo_anexo}
                  onChange={e => {
                    const idTipo = e.target.value
                    setFormAnexo(f => {
                      const next = { ...f, id_tipo_anexo: idTipo }
                      const codigo = tiposAnexo.find(t => t.id === Number(idTipo))?.codigo
                      if ((codigo === 'PRORROGA_PLAZO' || codigo === 'CONV_INDEFINIDO') && contrato.fecha_termino_pactada) {
                        next.fecha_anexo = sumarUnDia(contrato.fecha_termino_pactada)
                      }
                      return next
                    })
                  }}>
                  <option value="">Seleccionar…</option>
                  {tiposAnexo.map(t => (
                    <option key={t.id} value={t.id} disabled={yaProrrogado && t.codigo === 'PRORROGA_PLAZO'}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha del Anexo<span style={{color:'var(--danger)'}}> *</span></label>
                <input className="input" type="date" value={formAnexo.fecha_anexo}
                  onChange={e => setFormAnexo(f => ({ ...f, fecha_anexo: e.target.value }))} />
              </div>
              {esProrroga && (
                <div className="form-group">
                  <label className="form-label">Plazo de la Prórroga</label>
                  <select className="select" value={formAnexo.plazo_dias}
                    onChange={e => setFormAnexo(f => ({ ...f, plazo_dias: e.target.value }))}>
                    <option value="30">30 días</option>
                    <option value="60">60 días</option>
                    <option value="90">90 días</option>
                    <option value="120">120 días</option>
                  </select>
                  {formAnexo.fecha_anexo && (
                    <span style={{fontSize:11,color:'var(--gray-500)'}}>
                      Nuevo vencimiento: {calcularFechaTermino(formAnexo.fecha_anexo, formAnexo.plazo_dias)}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="form-group" style={{marginBottom:10}}>
              <label className="form-label">Observación</label>
              <textarea className="input" rows={2} value={formAnexo.observacion}
                onChange={e => setFormAnexo(f => ({ ...f, observacion: e.target.value }))} />
            </div>
            <div style={{display:'flex', justifyContent:'flex-end'}}>
              <button className="btn btn-primary btn-sm" onClick={guardarAnexo} disabled={guardandoAnexo}>
                {guardandoAnexo ? 'Guardando…' : 'Guardar Anexo'}
              </button>
            </div>
          </div>
        )}

        {anexos.length === 0
          ? <p className="text-muted">Sin anexos registrados</p>
          : anexos.map(a => {
            const codigoTipoAnexo = tiposAnexo.find(t => t.id === a.id_tipo_anexo)?.codigo
            const tieneWord = codigoTipoAnexo === 'PRORROGA_PLAZO' || codigoTipoAnexo === 'CONV_INDEFINIDO'
            return (
              <div key={a.id} style={{padding:'8px 0', borderBottom:'1px solid var(--gray-100)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span>{a.fecha_anexo} — {a.observacion || 'Sin observación'}</span>
                {tieneWord && (
                  <button className="btn btn-secondary btn-sm" onClick={() => descargarAnexoWord(a.id)} disabled={descargandoAnexoId === a.id}>
                    {descargandoAnexoId === a.id ? 'Generando…' : 'Descargar Word'}
                  </button>
                )}
              </div>
            )
          })
        }
      </div>

      {/* ── Certificado de Antigüedad ── */}
      <div className="card mt-4">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
          <h3 style={{fontWeight:600}}>Certificado de Antigüedad</h3>
        </div>
        <p style={{fontSize:13, color:'var(--gray-600)', marginBottom:12}}>
          Genera el certificado de antigüedad laboral con los datos del trabajador y contrato.
        </p>
        <div style={{display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap'}}>
          <div className="form-group" style={{margin:0}}>
            <label className="form-label" style={{fontSize:12}}>Ciudad</label>
            <input className="input" type="text" value={ciudadCertificado}
              onChange={e => setCiudadCertificado(e.target.value)}
              style={{fontSize:13, width:140}} />
          </div>
          <div className="form-group" style={{margin:0}}>
            <label className="form-label" style={{fontSize:12}}>Fecha de emisión</label>
            <input className="input" type="date" value={fechaCertificado}
              onChange={e => setFechaCertificado(e.target.value)}
              style={{fontSize:13}} />
          </div>
          <button className="btn btn-outline btn-sm" onClick={descargarCertificado} disabled={descargandoCertificado}>
            {descargandoCertificado ? '...' : '📄 Generar Word'}
          </button>
        </div>
      </div>

      {/* ── Carta de Amonestación ── */}
      <div className="card mt-4">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: amonExpandido ? 12 : 0}}>
          <h3 style={{fontWeight:600}}>Carta de Amonestación</h3>
          <button className="btn btn-outline btn-sm"
            onClick={() => setAmonExpandido(v => !v)}
            style={{fontSize:12}}>
            {amonExpandido ? '▲ Contraer' : '▼ Expandir'}
          </button>
        </div>
        {amonExpandido && <>
        <p style={{fontSize:13, color:'var(--gray-600)', marginBottom:12}}>
          Genera una carta de amonestación escrita con los datos del trabajador. Motivos aceptados por la Dirección del Trabajo.
        </p>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
          <div className="form-group" style={{margin:0}}>
            <label className="form-label" style={{fontSize:12}}>Motivo<span style={{color:'var(--danger)'}}> *</span></label>
            <select className="select" value={formAmon.motivo}
              onChange={e => setFormAmon(f => ({ ...f, motivo: e.target.value }))} style={{fontSize:13}}>
              <option value="">Seleccionar motivo…</option>
              {MOTIVOS_AMONESTACION.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group" style={{margin:0}}>
            <label className="form-label" style={{fontSize:12}}>Fecha</label>
            <input className="input" type="date" value={formAmon.fecha}
              onChange={e => setFormAmon(f => ({ ...f, fecha: e.target.value }))} style={{fontSize:13}} />
          </div>
          <div className="form-group" style={{margin:0, gridColumn:'1 / -1'}}>
            <label className="form-label" style={{fontSize:12}}>Descripción adicional (opcional)</label>
            <textarea className="input" rows={2} value={formAmon.descripcion}
              onChange={e => setFormAmon(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Detalles específicos del incidente…" style={{fontSize:13}} />
          </div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={descargarAmonestacion} disabled={descargandoAmon}>
          {descargandoAmon ? '...' : '📄 Generar Word'}
        </button>
        </>}
      </div>

      {/* ── Carta de Despido ── */}
      <div className="card mt-4">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: despidoExpandido ? 12 : 0}}>
          <div>
            <h3 style={{fontWeight:600}}>Carta de Despido</h3>
            {!despidoExpandido && despidoGuardado && (
              <p style={{fontSize:12, color:'var(--gray-500)', margin:'2px 0 0'}}>
                {formDespido.causal_codigo} · {formDespido.fecha_termino}
                {montosDespido ? ` · Total: ${fmt(montosDespido.total)}` : ''}
              </p>
            )}
          </div>
          <button className="btn btn-outline btn-sm"
            onClick={() => setDespidoExpandido(v => !v)}
            style={{fontSize:12}}>
            {despidoExpandido ? '▲ Contraer' : '▼ Expandir'}
          </button>
        </div>
        {despidoExpandido && <>
        <p style={{fontSize:13, color:'var(--gray-600)', marginBottom:12}}>
          Genera la carta de aviso de término de contrato con la causal legal correspondiente y los montos a pagar.
        </p>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
          <div className="form-group" style={{margin:0, gridColumn:'1 / -1'}}>
            <label className="form-label" style={{fontSize:12}}>Causal<span style={{color:'var(--danger)'}}> *</span></label>
            <select className="select" value={formDespido.causal_codigo}
              onChange={e => { setFormDespido(f => ({ ...f, causal_codigo: e.target.value })); setMontosDespido(null) }}
              style={{fontSize:13}}>
              <option value="">Seleccionar causal…</option>
              {CAUSALES_DESPIDO.map(g => (
                <optgroup key={g.grupo} label={g.grupo}>
                  {g.items.map(c => <option key={c.codigo} value={c.codigo}>{c.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="form-group" style={{margin:0}}>
            <label className="form-label" style={{fontSize:12}}>Fecha de Término<span style={{color:'var(--danger)'}}> *</span></label>
            <input className="input" type="date" value={formDespido.fecha_termino}
              onChange={e => { setFormDespido(f => ({ ...f, fecha_termino: e.target.value })); setMontosDespido(null) }}
              style={{fontSize:13}} />
          </div>
          <div className="form-group" style={{margin:0, gridColumn:'1 / -1'}}>
            <label className="form-label" style={{fontSize:12}}>Descripción adicional (opcional)</label>
            <textarea className="input" rows={2} value={formDespido.descripcion_adicional}
              onChange={e => setFormDespido(f => ({ ...f, descripcion_adicional: e.target.value }))}
              placeholder="Contexto adicional para la carta…" style={{fontSize:13}} />
          </div>
          <div className="form-group" style={{margin:0}}>
            <label className="form-label" style={{fontSize:12}}>Días de vacaciones tomados</label>
            <input className="input" type="number" step="0.01" value={formDespido.dias_vacaciones_tomados}
              onChange={e => { setFormDespido(f => ({ ...f, dias_vacaciones_tomados: e.target.value })); setMontosDespido(null) }}
              style={{fontSize:13}} placeholder="0" />
          </div>
          <div style={{margin:0}} />
          <div className="form-group" style={{margin:0}}>
            <label className="form-label" style={{fontSize:12}}>Colación mensual ($)</label>
            <input className="input" type="number" value={formDespido.colacion_mensual}
              onChange={e => { setFormDespido(f => ({ ...f, colacion_mensual: e.target.value })); setMontosDespido(null) }}
              style={{fontSize:13}} placeholder="0" />
          </div>
          <div className="form-group" style={{margin:0}}>
            <label className="form-label" style={{fontSize:12}}>Movilización mensual ($)</label>
            <input className="input" type="number" value={formDespido.movilizacion_mensual}
              onChange={e => { setFormDespido(f => ({ ...f, movilizacion_mensual: e.target.value })); setMontosDespido(null) }}
              style={{fontSize:13}} placeholder="0" />
          </div>
          <div style={{gridColumn:'1 / -1', display:'flex', flexDirection:'column', gap:8}}>
            <label style={{display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer'}}>
              <input type="checkbox" checked={formDespido.incluye_gratificacion}
                onChange={e => { setFormDespido(f => ({ ...f, incluye_gratificacion: e.target.checked })); setMontosDespido(null) }} />
              Incluye gratificación proporcional (25% sueldo, tope RM×4,75/12)
            </label>
            <label style={{display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer'}}>
              <input type="checkbox" checked={formDespido.aviso_con_30_dias}
                onChange={e => { setFormDespido(f => ({ ...f, aviso_con_30_dias: e.target.checked })); setMontosDespido(null) }} />
              Se avisó con 30 días de anticipación (no procede indemnización sustitutiva de aviso previo)
            </label>
          </div>
        </div>
        <div style={{display:'flex', gap:8, marginBottom:12, alignItems:'center'}}>
          <button className="btn btn-outline btn-sm" onClick={calcularMontosDespido}
            disabled={!formDespido.causal_codigo || !formDespido.fecha_termino}>
            Calcular montos
          </button>
          <button className="btn btn-primary btn-sm" onClick={guardarDespido}
            disabled={!formDespido.causal_codigo || !formDespido.fecha_termino}>
            💾 Guardar
          </button>
          <button className="btn btn-outline btn-sm" onClick={descargarCartaDespido} disabled={descargandoDespido}>
            {descargandoDespido ? '...' : '📄 Generar Word'}
          </button>
          {despidoGuardado && (
            <span style={{fontSize:12, color:'var(--gray-500)'}}>✓ Datos guardados</span>
          )}
        </div>
        {montosDespido && (
          <div style={{padding:'12px', background:'var(--gray-50)', borderRadius:8, fontSize:13}}>
            {/* Remuneración días trabajados (imponible = sueldo + gratif proporcional) */}
            <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid var(--gray-200)'}}>
              <span className="text-muted">Remuneración días trabajados — {montosDespido.diasMes} días{formDespido.incluye_gratificacion ? ' (incl. gratif. prop.)' : ''}</span>
              <span>{fmt(montosDespido.montoDias)}</span>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid var(--gray-200)', color:'#b91c1c'}}>
              <span style={{paddingLeft:12}}>− AFP ({(montosDespido.tasaAfp * 100).toFixed(2)}%)</span>
              <span>−{fmt(montosDespido.descAfp)}</span>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid var(--gray-200)', color:'#b91c1c'}}>
              <span style={{paddingLeft:12}}>− Salud (7.00%)</span>
              <span>−{fmt(montosDespido.descSalud)}</span>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid var(--gray-200)', color:'#b91c1c'}}>
              <span style={{paddingLeft:12}}>− AFC (0.60%)</span>
              <span>−{fmt(montosDespido.descAfc)}</span>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid var(--gray-100)', fontWeight:600}}>
              <span style={{paddingLeft:12}}>Neto días trabajados</span>
              <span>{fmt(montosDespido.montoDiasNeto)}</span>
            </div>
            {montosDespido.remPendiente > 0 && (
              <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid var(--gray-200)'}}>
                <span className="text-muted">Colación + movilización proporcional ({montosDespido.diasMes} días) — no imponible</span>
                <span>{fmt(montosDespido.remPendiente)}</span>
              </div>
            )}
            {montosDespido.vacProp > 0 && (
              <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid var(--gray-200)'}}>
                <span className="text-muted">
                  Vacaciones proporcionales — {montosDespido.diasGanados} días ganados − {montosDespido.diasTomados} tomados = {montosDespido.diasPendientes} hábiles + {montosDespido.diasInhabiles} inhábiles = {montosDespido.diasCalendario} días calendario
                </span>
                <span>{fmt(montosDespido.vacProp)}</span>
              </div>
            )}
            {montosDespido.tieneIndem && (
              <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid var(--gray-200)'}}>
                <span className="text-muted">
                  Indemnización años de servicio ({montosDespido.anosCompletos} año{montosDespido.anosCompletos !== 1 ? 's' : ''}) — base sueldo + gratif + colac + movil
                </span>
                <span>{fmt(montosDespido.indemAnos)}</span>
              </div>
            )}
            {montosDespido.tieneIndem && montosDespido.aviso > 0 && (
              <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid var(--gray-200)'}}>
                <span className="text-muted">Indemnización sustitutiva aviso previo — misma base</span>
                <span>{fmt(montosDespido.aviso)}</span>
              </div>
            )}
            {montosDespido.indemTiempoServido > 0 && (
              <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid var(--gray-200)'}}>
                <span className="text-muted">Indem. tiempo servido — Art. 163 bis CT (2,5 días/mes)</span>
                <span>{fmt(montosDespido.indemTiempoServido)}</span>
              </div>
            )}
            <div style={{display:'flex', justifyContent:'space-between', padding:'8px 0', marginTop:4, fontWeight:700}}>
              <span>Total</span>
              <span>{fmt(montosDespido.total)}</span>
            </div>
          </div>
        )}
        </>}
      </div>

      {/* ── Finiquito ── */}
      {despidoGuardado && (
        <div className="card mt-4">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
            <div>
              <h3 style={{fontWeight:600}}>Finiquito de Contrato de Trabajo</h3>
              <p style={{fontSize:12, color:'var(--gray-500)', margin:'2px 0 0'}}>
                Documento legal con cláusulas — requiere ratificación ante Ministro de Fe (Art. 177 CT)
              </p>
            </div>
          </div>
          <div style={{background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'10px 14px', fontSize:12, marginBottom:14, color:'#92400e'}}>
            <strong>Cobertura legal del finiquito generado:</strong>
            <ul style={{margin:'6px 0 0 16px', padding:0, lineHeight:1.7}}>
              <li>✅ Identificación de partes con RUT (Art. 177 CT)</li>
              <li>✅ Causal de término con artículo del CT</li>
              <li>✅ Período trabajado (fecha inicio y término)</li>
              <li>✅ Desglose detallado de cada concepto pagado en números y letras</li>
              <li>✅ Declaración amplia de pago íntegro al trabajador (TERCERO)</li>
              <li>✅ Cotizaciones previsionales al día — Art. 162 CT (CUARTO)</li>
              <li>✅ Ley N° 21.389 — Registro Nacional Deudores Alimentos (QUINTO)</li>
              <li>✅ Bloque de ratificación ante Ministro de Fe</li>
              <li>✅ Dos ejemplares, firmas con RUT de ambas partes</li>
              <li>⚠️ <strong>Verificar cotizaciones al día antes de firmar</strong> (Art. 162 CT obliga al empleador a certificarlo)</li>
              <li>⚠️ <strong>El trabajador puede firmar con "Reserva de Acciones"</strong> — en ese caso el finiquito no extingue el derecho a demandar</li>
            </ul>
          </div>
          <button className="btn btn-primary btn-sm" onClick={descargarFiniquito} disabled={descargandoFiniquito}>
            {descargandoFiniquito ? '...' : '📄 Generar Finiquito Word'}
          </button>
        </div>
      )}

      {contrato.estado === 'finiquitado' && (
        <div className="card mt-4">
          <h3 style={{marginBottom:12, fontWeight:600}}>Cálculo de Finiquito (vía API)</h3>
          {errorFiniquito && (
            <div style={{padding:'8px 12px', borderRadius:6, marginBottom:10, background:'#fee2e2', color:'#b91c1c', fontSize:13}}>
              {errorFiniquito}
            </div>
          )}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:10}}>
            <div className="form-group">
              <label className="form-label">Fecha Último Feriado Legal</label>
              <input className="input" type="date" value={formFiniquito.fecha_ultimo_feriado}
                onChange={e => setFormFiniquito(f => ({ ...f, fecha_ultimo_feriado: e.target.value }))} />
              <span style={{fontSize:11, color:'var(--gray-500)'}}>Si nunca usó feriado, deja vacío (se usa la fecha de inicio del contrato)</span>
            </div>
            <div className="form-group">
              <label className="form-label">Días Feriado Anual</label>
              <input className="input" type="number" value={formFiniquito.dias_feriado_anual}
                onChange={e => setFormFiniquito(f => ({ ...f, dias_feriado_anual: e.target.value }))} />
            </div>
          </div>
          <div style={{display:'flex', gap:16, marginBottom:12}}>
            <label style={{display:'flex', alignItems:'center', gap:6, fontSize:13}}>
              <input type="checkbox" checked={formFiniquito.procede_indemnizacion_anos_servicio}
                onChange={e => setFormFiniquito(f => ({ ...f, procede_indemnizacion_anos_servicio: e.target.checked }))} />
              Procede Indemnización por Años de Servicio
            </label>
            <label style={{display:'flex', alignItems:'center', gap:6, fontSize:13}}>
              <input type="checkbox" checked={formFiniquito.procede_aviso_previo}
                onChange={e => setFormFiniquito(f => ({ ...f, procede_aviso_previo: e.target.checked }))} />
              Procede Indemnización Sustitutiva de Aviso Previo
            </label>
          </div>
          <button className="btn btn-primary btn-sm" onClick={calcularFiniquito} disabled={calculandoFiniquito}>
            {calculandoFiniquito ? 'Calculando…' : 'Calcular Finiquito'}
          </button>

          {resultadoFiniquito && (
            <div style={{marginTop:16, padding:'12px', background:'var(--gray-50)', borderRadius:8}}>
              {[['Indemnización Años de Servicio', resultadoFiniquito.indemnizacion_anos_servicio],
                ['Indemnización Sustitutiva Aviso Previo', resultadoFiniquito.indemnizacion_sustitutiva_aviso],
                ['Vacaciones Proporcionales', resultadoFiniquito.vacaciones_proporcionales]].map(([k,v]) => (
                <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'4px 0'}}>
                  <span className="text-muted">{k}</span><span>{fmt(v)}</span>
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderTop:'1px solid var(--gray-200)',marginTop:6,fontWeight:700}}>
                <span>Total Finiquito</span><span>{fmt(resultadoFiniquito.total_finiquito)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
