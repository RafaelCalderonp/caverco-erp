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

  const [mostrarFormEpp, setMostrarFormEpp] = useState(false)
  const [formEpp, setFormEpp] = useState({ folio: '', fecha_entrega: '', items: '', observaciones: '' })
  const [guardandoEpp, setGuardandoEpp] = useState(false)
  const [errorEpp, setErrorEpp] = useState('')

  const [mostrarFormPacto, setMostrarFormPacto] = useState(false)
  const [formPacto, setFormPacto] = useState({ fecha_inicio: '', fecha_termino: '', tope_horas_diarias: 2, porcentaje_recargo: 0.5 })
  const [guardandoPacto, setGuardandoPacto] = useState(false)
  const [errorPacto, setErrorPacto] = useState('')
  const [pactos, setPactos] = useState([])

  const [formFiniquito, setFormFiniquito] = useState({ fecha_ultimo_feriado: '', procede_indemnizacion_anos_servicio: false, procede_aviso_previo: false, dias_feriado_anual: 15 })
  const [resultadoFiniquito, setResultadoFiniquito] = useState(null)
  const [calculandoFiniquito, setCalculandoFiniquito] = useState(false)
  const [errorFiniquito, setErrorFiniquito] = useState('')

  const [descargando, setDescargando] = useState(false)
  const [errorDescarga, setErrorDescarga] = useState('')

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

  async function guardarEpp() {
    if (!formEpp.fecha_entrega) {
      setErrorEpp('Fecha de entrega es obligatoria')
      return
    }
    setGuardandoEpp(true); setErrorEpp('')
    try {
      const items = formEpp.items
        ? formEpp.items.split(',').map(s => {
            const [item, cantidad] = s.split(':').map(p => p.trim())
            return { item, cantidad: Number(cantidad) || 1 }
          })
        : []
      await contratosApi.entregasEpp.create(id, {
        ...formEpp,
        items,
      })
      setFormEpp({ folio: '', fecha_entrega: '', items: '', observaciones: '' })
      setMostrarFormEpp(false)
      cargar()
    } catch (err) {
      setErrorEpp(err.response?.data?.detail || 'Error al guardar la entrega de EPP')
    } finally { setGuardandoEpp(false) }
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
      setFormPacto({ fecha_inicio: '', fecha_termino: '', tope_horas_diarias: 2, porcentaje_recargo: 0.5 })
      setMostrarFormPacto(false)
      cargar()
    } catch (err) {
      setErrorPacto(err.response?.data?.detail || 'Error al guardar el pacto de horas extra')
    } finally { setGuardandoPacto(false) }
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
          : anexos.map(a => (
            <div key={a.id} style={{padding:'8px 0', borderBottom:'1px solid var(--gray-100)'}}>
              {a.fecha_anexo} — {a.observacion || 'Sin observación'}
            </div>
          ))
        }
      </div>

      <div className="card mt-4">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
          <h3 style={{fontWeight:600}}>Requisitos de Ingreso a Obra ({requisitos.length})</h3>
          <button className="btn btn-outline btn-sm" onClick={() => { setMostrarFormRequisito(v => !v); setErrorRequisito('') }}>
            {mostrarFormRequisito ? 'Cancelar' : '+ Agregar Requisito'}
          </button>
        </div>

        {mostrarFormRequisito && (
          <div style={{padding:'12px', background:'var(--gray-50)', borderRadius:8, marginBottom:12}}>
            {errorRequisito && (
              <div style={{padding:'8px 12px', borderRadius:6, marginBottom:10, background:'#fee2e2', color:'#b91c1c', fontSize:13}}>
                {errorRequisito}
              </div>
            )}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:10}}>
              <div className="form-group">
                <label className="form-label">Obra<span style={{color:'var(--danger)'}}> *</span></label>
                <select className="select" value={formRequisito.id_obra}
                  onChange={e => setFormRequisito(f => ({ ...f, id_obra: e.target.value }))}>
                  <option value="">Seleccionar…</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Folio IRL/DS44</label>
                <input className="input" type="text" value={formRequisito.irl_ds44_folio}
                  onChange={e => setFormRequisito(f => ({ ...f, irl_ds44_folio: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha IRL/DS44</label>
                <input className="input" type="date" value={formRequisito.irl_ds44_fecha}
                  onChange={e => setFormRequisito(f => ({ ...f, irl_ds44_fecha: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha Ingreso a Obra</label>
                <input className="input" type="date" value={formRequisito.fecha_ingreso_obra}
                  onChange={e => setFormRequisito(f => ({ ...f, fecha_ingreso_obra: e.target.value }))} />
              </div>
            </div>
            <div className="form-group" style={{marginBottom:10}}>
              <label className="form-label" style={{display:'flex', alignItems:'center', gap:6}}>
                <input type="checkbox" checked={formRequisito.irl_ds44_aprobada}
                  onChange={e => setFormRequisito(f => ({ ...f, irl_ds44_aprobada: e.target.checked }))} />
                IRL/DS44 Aprobada
              </label>
            </div>
            <div className="form-group" style={{marginBottom:10}}>
              <label className="form-label">Observaciones</label>
              <textarea className="input" rows={2} value={formRequisito.observaciones}
                onChange={e => setFormRequisito(f => ({ ...f, observaciones: e.target.value }))} />
            </div>
            <div style={{display:'flex', justifyContent:'flex-end'}}>
              <button className="btn btn-primary btn-sm" onClick={guardarRequisito} disabled={guardandoRequisito}>
                {guardandoRequisito ? 'Guardando…' : 'Guardar Requisito'}
              </button>
            </div>
          </div>
        )}

        {requisitos.length === 0
          ? <p className="text-muted">Sin requisitos registrados</p>
          : requisitos.map(r => (
            <div key={r.id} style={{padding:'8px 0', borderBottom:'1px solid var(--gray-100)'}}>
              Obra #{r.id_obra} — IRL/DS44 folio {r.irl_ds44_folio || '—'} — {r.irl_ds44_aprobada ? 'Aprobado' : 'Pendiente'}
            </div>
          ))
        }
      </div>

      <div className="card mt-4">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
          <h3 style={{fontWeight:600}}>Entrega de EPP ({entregas.length})</h3>
          <button className="btn btn-outline btn-sm" onClick={() => { setMostrarFormEpp(v => !v); setErrorEpp('') }}>
            {mostrarFormEpp ? 'Cancelar' : '+ Agregar Entrega'}
          </button>
        </div>

        {mostrarFormEpp && (
          <div style={{padding:'12px', background:'var(--gray-50)', borderRadius:8, marginBottom:12}}>
            {errorEpp && (
              <div style={{padding:'8px 12px', borderRadius:6, marginBottom:10, background:'#fee2e2', color:'#b91c1c', fontSize:13}}>
                {errorEpp}
              </div>
            )}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:10}}>
              <div className="form-group">
                <label className="form-label">Fecha de Entrega<span style={{color:'var(--danger)'}}> *</span></label>
                <input className="input" type="date" value={formEpp.fecha_entrega}
                  onChange={e => setFormEpp(f => ({ ...f, fecha_entrega: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Folio</label>
                <input className="input" type="text" value={formEpp.folio}
                  onChange={e => setFormEpp(f => ({ ...f, folio: e.target.value }))} />
              </div>
            </div>
            <div className="form-group" style={{marginBottom:10}}>
              <label className="form-label">Ítems (formato: ítem:cantidad, separados por coma)</label>
              <input className="input" type="text" placeholder="Ej: Casco:1, Guantes:2"
                value={formEpp.items}
                onChange={e => setFormEpp(f => ({ ...f, items: e.target.value }))} />
            </div>
            <div className="form-group" style={{marginBottom:10}}>
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
            <div key={e.id} style={{padding:'8px 0', borderBottom:'1px solid var(--gray-100)'}}>
              {e.fecha_entrega} — folio {e.folio || '—'} — {(e.items || []).map(i => `${i.item} x${i.cantidad}`).join(', ')}
            </div>
          ))
        }
      </div>

      <div className="card mt-4">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
          <h3 style={{fontWeight:600}}>Pactos de Horas Extra ({pactos.length})</h3>
          <button className="btn btn-outline btn-sm" onClick={() => { setMostrarFormPacto(v => !v); setErrorPacto('') }}>
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
                <input className="input" type="date" value={formPacto.fecha_termino}
                  onChange={e => setFormPacto(f => ({ ...f, fecha_termino: e.target.value }))} />
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
            <div key={p.id} style={{padding:'8px 0', borderBottom:'1px solid var(--gray-100)'}}>
              {p.fecha_inicio} a {p.fecha_termino} — tope {p.tope_horas_diarias} hrs/día — recargo {Number(p.porcentaje_recargo) * 100}%
            </div>
          ))
        }
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
