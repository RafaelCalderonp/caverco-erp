import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { contratosApi, catalogosApi, liquidacionesApi } from '../services/api'

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

  const [editando, setEditando] = useState(false)
  const [formContrato, setFormContrato] = useState(null)
  const [guardandoContrato, setGuardandoContrato] = useState(false)
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

  const TOPE_GRATIF_MENSUAL = 213354

  const [formDespido, setFormDespido] = useState({
    causal_codigo: '', fecha_termino: '',
    aviso_con_30_dias: false,
    incluye_gratificacion: false,
    colacion_mensual: '',
    movilizacion_mensual: '',
    descripcion_adicional: '',
  })

  // Auto-cargar colación/movilización del contrato cuando esté disponible
  useEffect(() => {
    if (contrato) {
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
      const disposition = r.headers['content-disposition'] || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const nombre = match ? match[1] : `Anexo_${idAnexo}.docx`
      const url = URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      a.href = url; a.download = nombre
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('No se pudo generar el documento Word de este anexo')
    } finally { setDescargandoAnexoId(null) }
  }

  async function descargarWord() {
    setDescargando(true); setErrorDescarga('')
    try {
      const r = await contratosApi.descargarWord(id)
      const disposition = r.headers['content-disposition'] || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const nombre = match ? match[1] : `Contrato_${id}.docx`
      const url = URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      a.href = url; a.download = nombre
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setErrorDescarga('No se pudo generar el documento Word')
    } finally { setDescargando(false) }
  }

  function cargar() {
    contratosApi.get(id).then(r => setContrato(r.data)).catch(() => {})
    contratosApi.anexos.list(id).then(r => setAnexos(r.data)).catch(() => {})
    contratosApi.requisitosObra.list(id).then(r => setRequisitos(r.data)).catch(() => {})
    contratosApi.entregasEpp.list(id).then(r => setEntregas(r.data)).catch(() => {})
    contratosApi.pactosHorasExtra.list(id).then(r => setPactos(r.data)).catch(() => {})
  }

  useEffect(() => {
    cargar()
    catalogosApi.tiposAnexo().then(r => setTiposAnexo(r.data)).catch(() => {})
    catalogosApi.obras().then(r => setObras(r.data)).catch(() => {})
    catalogosApi.cargos().then(r => setCargos(r.data)).catch(() => {})
    catalogosApi.centrosCosto().then(r => setCentrosCosto(r.data)).catch(() => {})
    catalogosApi.tiposContrato().then(r => setTiposContrato(r.data)).catch(() => {})
    catalogosApi.motivosTermino().then(r => setMotivosTermino(r.data)).catch(() => {})
  }, [id])

  const esPlazoFijo = tiposContrato.find(t => t.id === Number(formContrato?.id_tipo_contrato))?.codigo === 'PLAZO_FIJO'
  const esProrroga = tiposAnexo.find(t => t.id === Number(formAnexo.id_tipo_anexo))?.codigo === 'PRORROGA_PLAZO'
  const yaProrrogado = anexos.some(a => tiposAnexo.find(t => t.id === a.id_tipo_anexo)?.codigo === 'PRORROGA_PLAZO')

  const abrirEdicion = () => {
    setFormContrato({
      numero_contrato: contrato.numero_contrato || '',
      id_tipo_contrato: contrato.id_tipo_contrato || '',
      plazo_dias: '30',
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
      horario_detalle: contrato.horario_detalle || '',
      id_obra: contrato.id_obra || '',
      id_centro_costo: contrato.id_centro_costo || '',
      id_cargo: contrato.id_cargo || '',
    })
    setErrorContrato('')
    setEditando(true)
  }

  const guardarContrato = async () => {
    setGuardandoContrato(true); setErrorContrato('')
    try {
      const { plazo_dias, ...formSinPlazo } = formContrato
      await contratosApi.update(id, {
        ...formSinPlazo,
        id_tipo_contrato: formContrato.id_tipo_contrato ? Number(formContrato.id_tipo_contrato) : null,
        fecha_contrato: formContrato.fecha_contrato || null,
        fecha_inicio: formContrato.fecha_inicio || null,
        fecha_termino_pactada: formContrato.fecha_termino_pactada || null,
        fecha_termino_real: formContrato.fecha_termino_real || null,
        id_motivo_termino: formContrato.id_motivo_termino ? Number(formContrato.id_motivo_termino) : null,
        aviso_previo_fecha: formContrato.aviso_previo_fecha || null,
        sueldo_bruto: Number(formContrato.sueldo_bruto),
        colacion: Number(formContrato.colacion) || 0,
        movilizacion: Number(formContrato.movilizacion) || 0,
        horas_semanales: Number(formContrato.horas_semanales),
        id_obra: formContrato.id_obra ? Number(formContrato.id_obra) : null,
        id_centro_costo: formContrato.id_centro_costo ? Number(formContrato.id_centro_costo) : null,
        id_cargo: formContrato.id_cargo ? Number(formContrato.id_cargo) : null,
      })
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
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = `Reglamento_Interno_${id}.docx`; a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Error al generar Word') }
    finally { setDescargandoReglamento(false) }
  }

  async function descargarCertificado() {
    setDescargandoCertificado(true)
    try {
      const res = await contratosApi.certificadoAntiguedad.word(id, ciudadCertificado, fechaCertificado)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = `Certificado_Antiguedad_${id}.docx`; a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Error al generar certificado') }
    finally { setDescargandoCertificado(false) }
  }

  async function descargarAmonestacion() {
    if (!formAmon.motivo) { alert('Selecciona un motivo'); return }
    setDescargandoAmon(true)
    try {
      const res = await contratosApi.amonestacion.word(id, formAmon.motivo, formAmon.descripcion, formAmon.fecha)
      const disposition = res.headers['content-disposition'] || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const nombre = match ? match[1] : `Amonestacion_${id}.docx`
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = nombre; a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Error al generar amonestación') }
    finally { setDescargandoAmon(false) }
  }

  function calcularMontosDespido() {
    if (!formDespido.causal_codigo || !formDespido.fecha_termino || !contrato?.sueldo_bruto) return
    const sueldo = Number(contrato.sueldo_bruto)
    const sueldoDia = sueldo / 30
    const fTermino = new Date(formDespido.fecha_termino + 'T00:00:00')
    const diasMes = fTermino.getDate()
    const montoDias = Math.round(sueldoDia * diasMes)

    const fInicio = contrato.fecha_inicio ? new Date(contrato.fecha_inicio + 'T00:00:00') : null
    let anosCompletos = 0
    let vacProp = 0
    if (fInicio) {
      const diffDias = (fTermino - fInicio) / (1000 * 60 * 60 * 24)
      const anos = diffDias / 365.25
      anosCompletos = Math.floor(anos)
      if (anos - anosCompletos >= 0.5) anosCompletos++
      anosCompletos = Math.min(anosCompletos, 11)
      const diasAnio = Math.round(diffDias % 365)
      vacProp = Math.round(sueldoDia * (diasAnio / 365) * 15)
    }

    const causalInfo = CAUSALES_DESPIDO.flatMap(g => g.items).find(c => c.codigo === formDespido.causal_codigo)
    const tieneIndem = causalInfo?.indem || false
    const indemAnos = tieneIndem ? sueldo * anosCompletos : 0
    const aviso = (tieneIndem && !formDespido.aviso_con_30_dias) ? sueldo : 0
    const gratif = formDespido.incluye_gratificacion
      ? Math.round(Math.min(sueldo * 0.25, TOPE_GRATIF_MENSUAL) * diasMes / 30)
      : 0
    const colacion = Number(formDespido.colacion_mensual) || 0
    const movilizacion = Number(formDespido.movilizacion_mensual) || 0
    const remPendiente = Math.round((colacion + movilizacion) * diasMes / 30)

    setMontosDespido({
      diasMes, montoDias, vacProp, anosCompletos, indemAnos, aviso, tieneIndem, gratif, remPendiente,
      total: montoDias + vacProp + indemAnos + aviso + gratif + remPendiente,
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
        descripcion_adicional: formDespido.descripcion_adicional,
      })
      const disposition = res.headers['content-disposition'] || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const nombre = match ? match[1] : `Carta_Despido_${id}.docx`
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = nombre; a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Error al generar carta de despido') }
    finally { setDescargandoDespido(false) }
  }

  async function descargarEppWord(eppId) {
    setDescargandoEpp(eppId)
    try {
      const res = await contratosApi.entregasEpp.word(id, eppId)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = `EntregaEPP_${eppId}.docx`; a.click()
      URL.revokeObjectURL(url)
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
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = `Pacto_Horas_Extra_${pactoId}.docx`; a.click()
      URL.revokeObjectURL(url)
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
            <button className="btn btn-outline btn-sm" onClick={abrirEdicion}>✏️ Editar</button>
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
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:10}}>
            <div className="form-group">
              <label className="form-label">N° de Contrato</label>
              <input className="input" value={formContrato.numero_contrato}
                onChange={e => setFormContrato(f => ({ ...f, numero_contrato: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de Contrato</label>
              <select className="select" value={formContrato.id_tipo_contrato}
                onChange={e => setFormContrato(f => ({ ...f, id_tipo_contrato: e.target.value }))}>
                <option value="">Sin asignar</option>
                {tiposContrato.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            {esPlazoFijo && (
              <div className="form-group">
                <label className="form-label">Plazo</label>
                <select className="select" value={formContrato.plazo_dias || '30'}
                  onChange={e => {
                    const dias = e.target.value
                    setFormContrato(f => {
                      const next = { ...f, plazo_dias: dias }
                      if (dias && f.fecha_inicio) next.fecha_termino_pactada = calcularFechaTermino(f.fecha_inicio, dias)
                      return next
                    })
                  }}>
                  <option value="30">30 días</option>
                  <option value="60">60 días</option>
                  <option value="90">90 días</option>
                  <option value="120">120 días</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Sueldo Bruto</label>
              <input className="input" type="number" value={formContrato.sueldo_bruto}
                onChange={e => setFormContrato(f => ({ ...f, sueldo_bruto: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Colación ($ mensual)</label>
              <input className="input" type="number" value={formContrato.colacion}
                onChange={e => setFormContrato(f => ({ ...f, colacion: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Movilización ($ mensual)</label>
              <input className="input" type="number" value={formContrato.movilizacion}
                onChange={e => setFormContrato(f => ({ ...f, movilizacion: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Horas Semanales</label>
              <input className="input" type="number" value={formContrato.horas_semanales}
                onChange={e => setFormContrato(f => ({ ...f, horas_semanales: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Jornada</label>
              <select className="select" value={formContrato.jornada}
                onChange={e => setFormContrato(f => ({ ...f, jornada: e.target.value }))}>
                <option value="Completa">Completa</option>
                <option value="Parcial">Parcial</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Fecha Contrato</label>
              <input className="input" type="date" value={formContrato.fecha_contrato}
                onChange={e => setFormContrato(f => ({ ...f, fecha_contrato: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha Inicio</label>
              <input className="input" type="date" value={formContrato.fecha_inicio}
                onChange={e => {
                  const fechaInicio = e.target.value
                  setFormContrato(f => {
                    const next = { ...f, fecha_inicio: fechaInicio }
                    if (esPlazoFijo && f.plazo_dias && fechaInicio) next.fecha_termino_pactada = calcularFechaTermino(fechaInicio, f.plazo_dias)
                    return next
                  })
                }} />
            </div>
            <div className="form-group">
              <label className="form-label">Obra</label>
              <select className="select" value={formContrato.id_obra}
                onChange={e => setFormContrato(f => ({ ...f, id_obra: e.target.value }))}>
                <option value="">Sin asignar</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.codigo} — {o.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Centro de Costo</label>
              <select className="select" value={formContrato.id_centro_costo}
                onChange={e => setFormContrato(f => ({ ...f, id_centro_costo: e.target.value }))}>
                <option value="">Sin asignar</option>
                {centrosCosto.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cargo</label>
              <select className="select" value={formContrato.id_cargo}
                onChange={e => setFormContrato(f => ({ ...f, id_cargo: e.target.value }))}>
                <option value="">Sin asignar</option>
                {cargos.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
              </select>
            </div>
            <div className="form-group span2">
              <label className="form-label">Detalle de Horario</label>
              <textarea className="input" rows={2} value={formContrato.horario_detalle}
                onChange={e => setFormContrato(f => ({ ...f, horario_detalle: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha Término Pactada</label>
              <input className="input" type="date" value={formContrato.fecha_termino_pactada}
                onChange={e => setFormContrato(f => ({ ...f, fecha_termino_pactada: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha Término Real</label>
              <input className="input" type="date" value={formContrato.fecha_termino_real}
                onChange={e => setFormContrato(f => ({ ...f, fecha_termino_real: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Motivo Término</label>
              <select className="select" value={formContrato.id_motivo_termino}
                onChange={e => setFormContrato(f => ({ ...f, id_motivo_termino: e.target.value }))}>
                <option value="">Sin asignar</option>
                {motivosTermino.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Aviso Previo (fecha)</label>
              <input className="input" type="date" value={formContrato.aviso_previo_fecha}
                onChange={e => setFormContrato(f => ({ ...f, aviso_previo_fecha: e.target.value }))} />
            </div>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button className="btn btn-primary btn-sm" onClick={guardarContrato} disabled={guardandoContrato}>
              {guardandoContrato ? 'Guardando…' : 'Guardar Cambios'}
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setEditando(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        <div className="card">
          <h3 style={{marginBottom:16, fontWeight:600}}>Datos del Contrato</h3>
          {[['Empleado', contrato.empleado ? `${contrato.empleado.codigo || '#' + contrato.empleado.id} — ${contrato.empleado.nombres} ${contrato.empleado.apellido_paterno}` : `#${contrato.id_empleado}`],
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
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
          <h3 style={{fontWeight:600}}>Carta de Amonestación</h3>
        </div>
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
      </div>

      {/* ── Carta de Despido ── */}
      <div className="card mt-4">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
          <h3 style={{fontWeight:600}}>Carta de Despido</h3>
        </div>
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
        <div style={{display:'flex', gap:8, marginBottom:12}}>
          <button className="btn btn-outline btn-sm" onClick={calcularMontosDespido}
            disabled={!formDespido.causal_codigo || !formDespido.fecha_termino}>
            Calcular montos
          </button>
          <button className="btn btn-outline btn-sm" onClick={descargarCartaDespido} disabled={descargandoDespido}>
            {descargandoDespido ? '...' : '📄 Generar Word'}
          </button>
        </div>
        {montosDespido && (
          <div style={{padding:'12px', background:'var(--gray-50)', borderRadius:8, fontSize:13}}>
            <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid var(--gray-200)'}}>
              <span className="text-muted">Remuneración días trabajados ({montosDespido.diasMes} días)</span>
              <span>{fmt(montosDespido.montoDias)}</span>
            </div>
            {montosDespido.remPendiente > 0 && (
              <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid var(--gray-200)'}}>
                <span className="text-muted">Colación + movilización proporcional ({montosDespido.diasMes} días)</span>
                <span>{fmt(montosDespido.remPendiente)}</span>
              </div>
            )}
            <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid var(--gray-200)'}}>
              <span className="text-muted">Vacaciones proporcionales</span>
              <span>{fmt(montosDespido.vacProp)}</span>
            </div>
            {montosDespido.gratif > 0 && (
              <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid var(--gray-200)'}}>
                <span className="text-muted">Gratificación proporcional (Art. 50 CT)</span>
                <span>{fmt(montosDespido.gratif)}</span>
              </div>
            )}
            {montosDespido.tieneIndem && (
              <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid var(--gray-200)'}}>
                <span className="text-muted">Indemnización por años de servicio ({montosDespido.anosCompletos} año{montosDespido.anosCompletos !== 1 ? 's' : ''})</span>
                <span>{fmt(montosDespido.indemAnos)}</span>
              </div>
            )}
            {montosDespido.tieneIndem && montosDespido.aviso > 0 && (
              <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid var(--gray-200)'}}>
                <span className="text-muted">Indemnización sustitutiva de aviso previo</span>
                <span>{fmt(montosDespido.aviso)}</span>
              </div>
            )}
            <div style={{display:'flex', justifyContent:'space-between', padding:'8px 0', marginTop:4, fontWeight:700}}>
              <span>Total</span>
              <span>{fmt(montosDespido.total)}</span>
            </div>
          </div>
        )}
      </div>

      {contrato.estado === 'finiquitado' && (
        <div className="card mt-4">
          <h3 style={{marginBottom:12, fontWeight:600}}>Cálculo de Finiquito</h3>
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
