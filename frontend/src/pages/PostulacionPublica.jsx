import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { postulacionApi } from '../services/api'
import { REGIONES, COMUNAS_POR_REGION } from '../data/chile'
import { formatearRut, validarRut } from '../utils/rut'

const EMPTY = {
  rut: '', nombres: '', apellido_paterno: '', apellido_materno: '',
  fecha_nacimiento: '', genero: '', estado_civil: '', nacionalidad: 'Chilena',
  direccion: '', comuna: '', region: 'Metropolitana', ciudad: 'Santiago',
  telefono: '', email_personal: '',
  id_afp: '', id_isapre: '', valor_isapre_uf: '', n_cargas: 0,
  banco: '', tipo_cuenta: '', numero_cuenta: '',
  contacto_emergencia_nombre: '', contacto_emergencia_telefono: '',
}

function Campo({ label, required, children, span2 }) {
  return (
    <div className={`form-group${span2 ? ' span2' : ''}`}>
      <label className="form-label">{label}{required && <span style={{color:'var(--danger)'}}> *</span>}</label>
      {children}
    </div>
  )
}

export default function PostulacionPublica() {
  const { token } = useParams()
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [datosLink, setDatosLink] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [enviando, setEnviando] = useState(false)
  const [enviadoOk, setEnviadoOk] = useState(false)
  const [errores, setErrores] = useState({})

  useEffect(() => {
    postulacionApi.obtener(token)
      .then(r => {
        setDatosLink(r.data)
        if (r.data.datos) {
          setForm(f => ({
            ...f,
            ...Object.fromEntries(Object.entries(r.data.datos).map(([k, v]) => [k, v ?? f[k]])),
          }))
        }
      })
      .catch(e => setError(e.response?.status === 404 ? 'Este enlace no es válido o ya no está disponible.' : 'No se pudo cargar el formulario.'))
      .finally(() => setCargando(false))
  }, [token])

  function setCampo(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function validar() {
    const e = {}
    if (!form.rut || !validarRut(form.rut)) e.rut = 'RUT inválido'
    if (!form.nombres) e.nombres = 'Requerido'
    if (!form.apellido_paterno) e.apellido_paterno = 'Requerido'
    if (!form.telefono) e.telefono = 'Requerido'
    if (!form.email_personal) e.email_personal = 'Requerido'
    if (!form.direccion) e.direccion = 'Requerido'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function enviar(ev) {
    ev.preventDefault()
    if (!validar()) return
    setEnviando(true); setError(null)
    try {
      const payload = { ...form }
      payload.id_afp = payload.id_afp ? Number(payload.id_afp) : null
      payload.id_isapre = payload.id_isapre ? Number(payload.id_isapre) : null
      payload.valor_isapre_uf = payload.valor_isapre_uf ? Number(payload.valor_isapre_uf) : null
      payload.n_cargas = Number(payload.n_cargas) || 0
      payload.fecha_nacimiento = payload.fecha_nacimiento || null
      await postulacionApi.enviar(token, payload)
      setEnviadoOk(true)
    } catch (e) {
      setError(e.response?.data?.detail || 'No se pudo enviar el formulario. Inténtalo de nuevo.')
    } finally { setEnviando(false) }
  }

  const wrap = { maxWidth: 720, margin: '40px auto', padding: '0 16px' }

  if (cargando) return <div style={wrap}><p>Cargando…</p></div>
  if (error && !datosLink) return <div style={wrap}><p style={{color:'red'}}>{error}</p></div>

  if (enviadoOk || datosLink?.estado === 'CONVERTIDA') {
    return (
      <div style={wrap}>
        <div className="card" style={{textAlign:'center', padding:32}}>
          <h2 style={{marginBottom:8}}>{datosLink?.estado === 'CONVERTIDA' ? '✅ Postulación ya procesada' : '✅ ¡Datos enviados!'}</h2>
          <p style={{color:'var(--gray-500)'}}>
            {datosLink?.estado === 'CONVERTIDA'
              ? `${datosLink?.empresa?.razon_social} ya generó tu contrato con estos datos.`
              : `Gracias. ${datosLink?.empresa?.razon_social} recibió tus datos y se pondrá en contacto contigo.`}
          </p>
        </div>
      </div>
    )
  }

  const comunas = COMUNAS_POR_REGION[form.region] || []

  return (
    <div style={wrap}>
      <div className="card" style={{marginBottom:16, display:'flex', alignItems:'center', gap:12}}>
        {datosLink?.empresa?.logo_url && <img src={datosLink.empresa.logo_url} alt="" style={{height:40}} />}
        <div>
          <h2 style={{margin:0}}>{datosLink?.empresa?.nombre_fantasia || datosLink?.empresa?.razon_social}</h2>
          <p style={{margin:0, fontSize:13, color:'var(--gray-500)'}}>Formulario de datos para contrato</p>
        </div>
      </div>

      <form className="card" onSubmit={enviar}>
        <p style={{fontSize:13, color:'var(--gray-500)', marginBottom:16}}>
          Completa tus datos personales. Serán usados por <strong>{datosLink?.empresa?.razon_social}</strong> exclusivamente
          para preparar tu contrato de trabajo.
        </p>

        {error && <p style={{color:'red', marginBottom:12}}>{error}</p>}

        <h3 style={{fontSize:14, margin:'16px 0 8px'}}>Datos personales</h3>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
          <Campo label="RUT" required>
            <input className="input" value={form.rut} onChange={e => setCampo('rut', formatearRut(e.target.value))} placeholder="12.345.678-9" />
            {errores.rut && <span style={{color:'red', fontSize:12}}>{errores.rut}</span>}
          </Campo>
          <Campo label="Fecha de Nacimiento">
            <input className="input" type="date" value={form.fecha_nacimiento} onChange={e => setCampo('fecha_nacimiento', e.target.value)} />
          </Campo>
          <Campo label="Nombres" required>
            <input className="input" value={form.nombres} onChange={e => setCampo('nombres', e.target.value)} />
            {errores.nombres && <span style={{color:'red', fontSize:12}}>{errores.nombres}</span>}
          </Campo>
          <Campo label="Apellido Paterno" required>
            <input className="input" value={form.apellido_paterno} onChange={e => setCampo('apellido_paterno', e.target.value)} />
            {errores.apellido_paterno && <span style={{color:'red', fontSize:12}}>{errores.apellido_paterno}</span>}
          </Campo>
          <Campo label="Apellido Materno">
            <input className="input" value={form.apellido_materno} onChange={e => setCampo('apellido_materno', e.target.value)} />
          </Campo>
          <Campo label="Nacionalidad">
            <input className="input" value={form.nacionalidad} onChange={e => setCampo('nacionalidad', e.target.value)} />
          </Campo>
          <Campo label="Género">
            <select className="input" value={form.genero} onChange={e => setCampo('genero', e.target.value)}>
              <option value="">— seleccionar —</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </Campo>
          <Campo label="Estado Civil">
            <select className="input" value={form.estado_civil} onChange={e => setCampo('estado_civil', e.target.value)}>
              <option value="">— seleccionar —</option>
              <option value="Soltero/a">Soltero/a</option>
              <option value="Casado/a">Casado/a</option>
              <option value="Divorciado/a">Divorciado/a</option>
              <option value="Viudo/a">Viudo/a</option>
              <option value="Conviviente Civil">Conviviente Civil</option>
            </select>
          </Campo>
        </div>

        <h3 style={{fontSize:14, margin:'20px 0 8px'}}>Contacto y domicilio</h3>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
          <Campo label="Teléfono" required>
            <input className="input" value={form.telefono} onChange={e => setCampo('telefono', e.target.value)} placeholder="+56 9 1234 5678" />
            {errores.telefono && <span style={{color:'red', fontSize:12}}>{errores.telefono}</span>}
          </Campo>
          <Campo label="Correo Personal" required>
            <input className="input" type="email" value={form.email_personal} onChange={e => setCampo('email_personal', e.target.value)} />
            {errores.email_personal && <span style={{color:'red', fontSize:12}}>{errores.email_personal}</span>}
          </Campo>
          <Campo label="Dirección" required span2>
            <input className="input" value={form.direccion} onChange={e => setCampo('direccion', e.target.value)} />
            {errores.direccion && <span style={{color:'red', fontSize:12}}>{errores.direccion}</span>}
          </Campo>
          <Campo label="Región">
            <select className="input" value={form.region} onChange={e => setCampo('region', e.target.value)}>
              {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Campo>
          <Campo label="Comuna">
            <select className="input" value={form.comuna} onChange={e => setCampo('comuna', e.target.value)}>
              <option value="">— seleccionar —</option>
              {comunas.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Campo>
          <Campo label="Ciudad">
            <input className="input" value={form.ciudad} onChange={e => setCampo('ciudad', e.target.value)} />
          </Campo>
        </div>

        <h3 style={{fontSize:14, margin:'20px 0 8px'}}>Previsión social</h3>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
          <Campo label="AFP">
            <select className="input" value={form.id_afp} onChange={e => setCampo('id_afp', e.target.value)}>
              <option value="">— seleccionar —</option>
              {datosLink?.afp.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Isapre / Fonasa">
            <select className="input" value={form.id_isapre} onChange={e => setCampo('id_isapre', e.target.value)}>
              <option value="">— seleccionar —</option>
              {datosLink?.isapre.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </select>
          </Campo>
          {form.id_isapre && !datosLink?.isapre.find(i => String(i.id) === String(form.id_isapre))?.es_fonasa && (
            <Campo label="Plan Isapre (UF)">
              <input className="input" type="number" step="0.01" value={form.valor_isapre_uf}
                onChange={e => setCampo('valor_isapre_uf', e.target.value)} />
            </Campo>
          )}
          <Campo label="N° de Cargas Familiares">
            <input className="input" type="number" min="0" value={form.n_cargas} onChange={e => setCampo('n_cargas', e.target.value)} />
          </Campo>
        </div>

        <h3 style={{fontSize:14, margin:'20px 0 8px'}}>Datos bancarios (para el pago de sueldo)</h3>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
          <Campo label="Banco">
            <input className="input" value={form.banco} onChange={e => setCampo('banco', e.target.value)} />
          </Campo>
          <Campo label="Tipo de Cuenta">
            <select className="input" value={form.tipo_cuenta} onChange={e => setCampo('tipo_cuenta', e.target.value)}>
              <option value="">— seleccionar —</option>
              <option value="Cuenta Corriente">Cuenta Corriente</option>
              <option value="Cuenta Vista">Cuenta Vista</option>
              <option value="Cuenta de Ahorro">Cuenta de Ahorro</option>
              <option value="Cuenta RUT">Cuenta RUT</option>
            </select>
          </Campo>
          <Campo label="N° de Cuenta" span2>
            <input className="input" value={form.numero_cuenta} onChange={e => setCampo('numero_cuenta', e.target.value)} />
          </Campo>
        </div>

        <h3 style={{fontSize:14, margin:'20px 0 8px'}}>Contacto de emergencia (opcional)</h3>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
          <Campo label="Nombre">
            <input className="input" value={form.contacto_emergencia_nombre} onChange={e => setCampo('contacto_emergencia_nombre', e.target.value)} />
          </Campo>
          <Campo label="Teléfono">
            <input className="input" value={form.contacto_emergencia_telefono} onChange={e => setCampo('contacto_emergencia_telefono', e.target.value)} />
          </Campo>
        </div>

        <div style={{marginTop:20}}>
          <button className="btn btn-primary" type="submit" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar mis datos'}
          </button>
        </div>
      </form>
    </div>
  )
}
