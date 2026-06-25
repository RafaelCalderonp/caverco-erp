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
  const [mostrarFormAnexo, setMostrarFormAnexo] = useState(false)
  const [formAnexo, setFormAnexo] = useState({ id_tipo_anexo: '', fecha_anexo: '', observacion: '' })
  const [guardandoAnexo, setGuardandoAnexo] = useState(false)
  const [errorAnexo, setErrorAnexo] = useState('')

  function cargar() {
    contratosApi.get(id).then(r => setContrato(r.data)).catch(() => {})
    contratosApi.anexos.list(id).then(r => setAnexos(r.data)).catch(() => {})
    contratosApi.requisitosObra.list(id).then(r => setRequisitos(r.data)).catch(() => {})
    contratosApi.entregasEpp.list(id).then(r => setEntregas(r.data)).catch(() => {})
  }

  useEffect(() => {
    cargar()
    catalogosApi.tiposAnexo().then(r => setTiposAnexo(r.data)).catch(() => {})
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
        <h3 style={{marginBottom:12, fontWeight:600}}>Requisitos de Ingreso a Obra ({requisitos.length})</h3>
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
        <h3 style={{marginBottom:12, fontWeight:600}}>Entrega de EPP ({entregas.length})</h3>
        {entregas.length === 0
          ? <p className="text-muted">Sin entregas registradas</p>
          : entregas.map(e => (
            <div key={e.id} style={{padding:'8px 0', borderBottom:'1px solid var(--gray-100)'}}>
              {e.fecha_entrega} — folio {e.folio || '—'} — {(e.items || []).map(i => `${i.item} x${i.cantidad}`).join(', ')}
            </div>
          ))
        }
      </div>
    </div>
  )
}
