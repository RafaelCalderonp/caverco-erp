import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { contratosApi, catalogosApi } from '../services/api'

export default function ContratoDetalle() {
  const { id } = useParams()
  const [contrato, setContrato] = useState(null)
  const [anexos, setAnexos] = useState([])
  const [requisitos, setRequisitos] = useState([])
  const [entregas, setEntregas] = useState([])
  const [tiposAnexo, setTiposAnexo] = useState([])
  const [obras, setObras] = useState([])
  const [mostrarFormAnexo, setMostrarFormAnexo] = useState(false)
  const [formAnexo, setFormAnexo] = useState({ id_tipo_anexo: '', fecha_anexo: '', observacion: '' })
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
  }, [id])

  async function guardarAnexo() {
    if (!formAnexo.id_tipo_anexo || !formAnexo.fecha_anexo) {
      setErrorAnexo('Tipo de anexo y fecha son obligatorios')
      return
    }
    setGuardandoAnexo(true); setErrorAnexo('')
    try {
      await contratosApi.anexos.create(id, {
        ...formAnexo,
        id_tipo_anexo: Number(formAnexo.id_tipo_anexo),
      })
      setFormAnexo({ id_tipo_anexo: '', fecha_anexo: '', observacion: '' })
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
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        <div className="card">
          <h3 style={{marginBottom:16, fontWeight:600}}>Datos del Contrato</h3>
          {[['Empleado', `#${contrato.id_empleado}`],
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
          {[['Obra', contrato.id_obra ? `#${contrato.id_obra}` : '—'],
            ['Centro de Costo', contrato.id_centro_costo ? `#${contrato.id_centro_costo}` : '—'],
            ['Cargo', contrato.id_cargo ? `#${contrato.id_cargo}` : '—'],
            ['Motivo Término', contrato.id_motivo_termino ? `#${contrato.id_motivo_termino}` : '—'],
            ['Aviso Previo', contrato.aviso_previo_fecha || '—']].map(([k,v]) => (
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--gray-100)'}}>
              <span className="text-muted">{k}</span><span style={{fontWeight:500}}>{v}</span>
            </div>
          ))}
        </div>
      </div>

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
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:10}}>
              <div className="form-group">
                <label className="form-label">Tipo de Anexo<span style={{color:'var(--danger)'}}> *</span></label>
                <select className="select" value={formAnexo.id_tipo_anexo}
                  onChange={e => setFormAnexo(f => ({ ...f, id_tipo_anexo: e.target.value }))}>
                  <option value="">Seleccionar…</option>
                  {tiposAnexo.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha del Anexo<span style={{color:'var(--danger)'}}> *</span></label>
                <input className="input" type="date" value={formAnexo.fecha_anexo}
                  onChange={e => setFormAnexo(f => ({ ...f, fecha_anexo: e.target.value }))} />
              </div>
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
    </div>
  )
}
