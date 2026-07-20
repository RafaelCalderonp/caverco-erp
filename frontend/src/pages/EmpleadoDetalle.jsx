import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { empleadosApi, catalogosApi, departamentosApi, contratosApi } from '../services/api'
import { formatearRut } from '../utils/rut'

export default function EmpleadoDetalle() {
  const { id } = useParams()
  const [emp, setEmp] = useState(null)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [errorCarga, setErrorCarga] = useState('')
  const [afps, setAfps] = useState([])
  const [isapres, setIsapres] = useState([])
  const [departamentos, setDepartamentos] = useState([])

  const cargar = () => {
    setErrorCarga('')
    empleadosApi.get(id).then(r => setEmp(r.data))
      .catch(err => setErrorCarga(err.response?.data?.detail || 'No se pudo cargar el trabajador'))
  }

  useEffect(() => {
    cargar()
    catalogosApi.afp().then(r => setAfps(r.data)).catch(() => {})
    catalogosApi.isapre().then(r => setIsapres(r.data)).catch(() => {})
    departamentosApi.list().then(r => setDepartamentos(r.data)).catch(() => {})
  }, [id])

  if (errorCarga) return (
    <div className="card">
      <p style={{color:'#b91c1c', marginBottom:12}}>{errorCarga}</p>
      <Link to="/empleados" className="btn btn-outline btn-sm">← Volver</Link>
    </div>
  )
  if (!emp) return <div className="card">Cargando…</div>

  const fmt = (n) => n ? `$${Number(n).toLocaleString('es-CL')}` : '—'

  const afpNombre = (id_afp) => afps.find(a => a.id === id_afp)?.nombre || '—'
  const isapreNombre = (id_isapre) => isapres.find(i => i.id === id_isapre)?.nombre || '—'
  const esIsapre = (id_isapre) => {
    const nombre = isapreNombre(id_isapre).toLowerCase()
    return nombre !== 'fonasa' && nombre !== '—'
  }

  const contratoVigente = emp?.contratos?.find(c => c.estado === 'vigente')

  const abrirEdicion = () => {
    setForm({
      nombres: emp.nombres || '',
      apellido_paterno: emp.apellido_paterno || '',
      apellido_materno: emp.apellido_materno || '',
      telefono: emp.telefono || '',
      email_corporativo: emp.email_corporativo || '',
      email_personal: emp.email_personal || '',
      direccion: emp.direccion || '',
      comuna: emp.comuna || '',
      ciudad: emp.ciudad || '',
      id_departamento: emp.id_departamento || '',
      id_afp: emp.id_afp || '',
      id_isapre: emp.id_isapre || '',
      valor_isapre_uf: emp.valor_isapre_uf || '',
      colacion: contratoVigente?.colacion ?? '',
      movilizacion: contratoVigente?.movilizacion ?? '',
    })
    setError('')
    setEditando(true)
  }

  const guardar = async () => {
    setGuardando(true); setError('')
    try {
      const { colacion, movilizacion, ...datosEmpleado } = form
      const payload = {
        ...datosEmpleado,
        id_departamento: datosEmpleado.id_departamento ? Number(datosEmpleado.id_departamento) : null,
      }
      if (!payload.id_afp) delete payload.id_afp
      if (!payload.id_isapre) delete payload.id_isapre
      if (!payload.valor_isapre_uf) delete payload.valor_isapre_uf
      await empleadosApi.update(id, payload)
      if (contratoVigente) {
        await contratosApi.update(contratoVigente.id, {
          colacion: Number(colacion) || 0,
          movilizacion: Number(movilizacion) || 0,
        })
      }
      setEditando(false)
      cargar()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar los cambios')
    } finally { setGuardando(false) }
  }

  const isapreSeleccionada = isapres.find(i => i.id === Number(form?.id_isapre))
  const esIsapreForm = isapreSeleccionada && isapreSeleccionada.nombre.toLowerCase() !== 'fonasa'

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Link to="/empleados" className="btn btn-outline btn-sm">← Volver</Link>
          <h1>{emp.nombres} {emp.apellido_paterno} {emp.apellido_materno || ''}</h1>
          <span className={`badge ${emp.activo ? 'badge-green' : 'badge-red'}`}>{emp.activo ? 'Activo' : 'Inactivo'}</span>
        </div>
        {!editando && <button className="btn btn-outline btn-sm" onClick={abrirEdicion}>✏️ Editar</button>}
      </div>

      {editando ? (
        <div className="card">
          <h3 style={{marginBottom:16, fontWeight:600}}>Editar Datos del Trabajador</h3>
          {error && (
            <div style={{padding:'8px 12px', borderRadius:6, marginBottom:10, background:'#fee2e2', color:'#b91c1c', fontSize:13}}>
              {error}
            </div>
          )}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16}}>
            <div className="form-group">
              <label className="form-label">RUT</label>
              <input className="input" value={formatearRut(emp.rut)} disabled />
              <span style={{fontSize:11,color:'var(--gray-500)'}}>El RUT no se puede modificar</span>
            </div>
            <div className="form-group">
              <label className="form-label">Código</label>
              <input className="input" value={emp.codigo || ''} disabled />
              <span style={{fontSize:11,color:'var(--gray-500)'}}>El código se asigna automáticamente</span>
            </div>
            <div className="form-group">
              <label className="form-label">Nombres</label>
              <input className="input" value={form.nombres} onChange={e => setForm(f => ({ ...f, nombres: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Apellido Paterno</label>
              <input className="input" value={form.apellido_paterno} onChange={e => setForm(f => ({ ...f, apellido_paterno: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Apellido Materno</label>
              <input className="input" value={form.apellido_materno} onChange={e => setForm(f => ({ ...f, apellido_materno: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="input" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Corporativo</label>
              <input className="input" type="email" value={form.email_corporativo} onChange={e => setForm(f => ({ ...f, email_corporativo: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Personal</label>
              <input className="input" type="email" value={form.email_personal} onChange={e => setForm(f => ({ ...f, email_personal: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Dirección</label>
              <input className="input" value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Comuna</label>
              <input className="input" value={form.comuna} onChange={e => setForm(f => ({ ...f, comuna: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Ciudad</label>
              <input className="input" value={form.ciudad} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))} />
            </div>
          </div>

          <h4 style={{marginBottom:12, fontWeight:600, fontSize:14, color:'var(--gray-700)'}}>Datos Laborales</h4>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:8}}>
            <div className="form-group">
              <label className="form-label">Departamento</label>
              <select className="input" value={form.id_departamento} onChange={e => setForm(f => ({ ...f, id_departamento: e.target.value }))}>
                <option value="">Sin asignar</option>
                {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </div>
            {contratoVigente && (
              <>
                <div className="form-group">
                  <label className="form-label">Colación (CLP)</label>
                  <input className="input" type="number" value={form.colacion}
                    onChange={e => setForm(f => ({ ...f, colacion: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Movilización (CLP)</label>
                  <input className="input" type="number" value={form.movilizacion}
                    onChange={e => setForm(f => ({ ...f, movilizacion: e.target.value }))} />
                </div>
              </>
            )}
          </div>
          <p className="text-muted" style={{fontSize:12, marginBottom:16}}>
            Cargo, Centro de Costo y Sueldo Base se definen en el Contrato vigente del trabajador
            y solo cambian con un nuevo Contrato o un Anexo de contrato.
          </p>

          <h4 style={{marginBottom:12, fontWeight:600, fontSize:14, color:'var(--gray-700)'}}>Previsión</h4>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16}}>
            <div className="form-group">
              <label className="form-label">AFP</label>
              <select className="input" value={form.id_afp} onChange={e => setForm(f => ({ ...f, id_afp: e.target.value }))}>
                <option value="">— Sin AFP —</option>
                {afps.map(a => <option key={a.id} value={a.id}>{a.nombre} ({(a.tasa * 100).toFixed(2)}%)</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Salud</label>
              <select className="input" value={form.id_isapre} onChange={e => setForm(f => ({ ...f, id_isapre: e.target.value, valor_isapre_uf: '' }))}>
                <option value="">— Sin salud —</option>
                {isapres.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </div>
            {esIsapreForm && (
              <div className="form-group">
                <label className="form-label">Valor Plan (UF)</label>
                <input className="input" type="number" step="0.01" placeholder="Ej: 2.50"
                  value={form.valor_isapre_uf}
                  onChange={e => setForm(f => ({ ...f, valor_isapre_uf: e.target.value }))} />
              </div>
            )}
          </div>

          <div style={{display:'flex', gap:8}}>
            <button className="btn btn-primary btn-sm" onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar Cambios'}
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setEditando(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        <div className="card">
          <h3 style={{marginBottom:16, fontWeight:600}}>Datos Personales</h3>
          {[['RUT', formatearRut(emp.rut)],['Código', emp.codigo],
            ['Email Corporativo', emp.email_corporativo],['Email Personal', emp.email_personal],
            ['Teléfono', emp.telefono],['Dirección', emp.direccion],['Comuna', emp.comuna],['Ciudad', emp.ciudad]].map(([k,v]) => (
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--gray-100)'}}>
              <span className="text-muted">{k}</span><span style={{fontWeight:500}}>{v || '—'}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 style={{marginBottom:16, fontWeight:600}}>Información Laboral y Previsión</h3>
          {[
            ['Departamento', emp.departamento?.nombre],
            ['Cargo', emp.cargo?.nombre],
            ['Centro de Costo', emp.centro_costo ? `${emp.centro_costo.codigo} — ${emp.centro_costo.nombre}` : null],
            ['Fecha Ingreso', emp.fecha_ingreso],
            ['Sueldo Base', fmt(emp.sueldo_base)],
            ['Colación', contratoVigente ? fmt(contratoVigente.colacion) : '—'],
            ['Movilización', contratoVigente ? fmt(contratoVigente.movilizacion) : '—'],
            ['AFP', afpNombre(emp.id_afp)],
            ['Salud', isapreNombre(emp.id_isapre)],
            ...(esIsapre(emp.id_isapre) ? [['Valor Plan Isapre', emp.valor_isapre_uf ? `${emp.valor_isapre_uf} UF` : '—']] : []),
          ].map(([k,v]) => (
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--gray-100)'}}>
              <span className="text-muted">{k}</span><span style={{fontWeight:500}}>{v || '—'}</span>
            </div>
          ))}
        </div>
      </div>
      )}

      <div className="card mt-4">
        <h3 style={{marginBottom:12, fontWeight:600}}>Contratos ({emp.contratos?.length || 0})</h3>
        {(!emp.contratos || emp.contratos.length === 0)
          ? <p className="text-muted">Sin contratos registrados</p>
          : emp.contratos.map(c => (
            <Link key={c.id} to={`/contratos/${c.id}`} style={{display:'block', padding:'8px 0', borderBottom:'1px solid var(--gray-100)'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span>
                  Contrato {c.numero_contrato || `#${c.id}`} — Desde {c.fecha_inicio}
                  {' '}<span className={`badge ${c.estado === 'vigente' ? 'badge-green' : 'badge-gray'}`}>{c.estado}</span>
                </span>
                <span style={{fontSize:13, color:'var(--gray-600)'}}>
                  Sueldo {fmt(c.sueldo_bruto)}
                  {Number(c.colacion) > 0 && <> · Colación {fmt(c.colacion)}</>}
                  {Number(c.movilizacion) > 0 && <> · Movilización {fmt(c.movilizacion)}</>}
                </span>
              </div>
            </Link>
          ))
        }
      </div>
    </div>
  )
}
