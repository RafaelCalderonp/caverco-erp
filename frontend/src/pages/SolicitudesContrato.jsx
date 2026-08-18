import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmpresa } from '../context/EmpresaContext'
import { enlacesPostulacionApi, postulacionesContratoApi } from '../services/api'

const ESTADO_LABEL = { ENVIADA: 'Enviada', CONVERTIDA: 'Convertida en contrato' }
const ESTADO_BADGE = { ENVIADA: 'badge-blue', CONVERTIDA: 'badge-green' }

export default function SolicitudesContrato() {
  const nav = useNavigate()
  const { empresaActual } = useEmpresa()
  const [enlaces, setEnlaces] = useState([])
  const [postulaciones, setPostulaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [nombreReferencia, setNombreReferencia] = useState('')
  const [creando, setCreando] = useState(false)
  const [copiadoId, setCopiadoId] = useState(null)
  const [error, setError] = useState(null)

  const cargar = () => {
    if (!empresaActual) return
    setCargando(true)
    Promise.all([
      enlacesPostulacionApi.listar(empresaActual.id),
      postulacionesContratoApi.listar(empresaActual.id),
    ]).then(([e, p]) => { setEnlaces(e.data); setPostulaciones(p.data) })
      .catch(() => { setEnlaces([]); setPostulaciones([]) })
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [empresaActual])

  const urlPublica = (token) => `${window.location.origin}/postulacion/${token}`

  async function generar() {
    setCreando(true); setError(null)
    try {
      await enlacesPostulacionApi.crear(empresaActual.id, nombreReferencia)
      setNombreReferencia('')
      cargar()
    } catch (e) {
      setError(e.response?.data?.detail || 'Error generando el enlace')
    } finally { setCreando(false) }
  }

  async function copiar(enlace) {
    try {
      await navigator.clipboard.writeText(urlPublica(enlace.token))
      setCopiadoId(enlace.id)
      setTimeout(() => setCopiadoId(null), 2000)
    } catch { alert(urlPublica(enlace.token)) }
  }

  async function toggleActivo(enlace) {
    try {
      await enlacesPostulacionApi.actualizar(empresaActual.id, enlace.id, !enlace.activo)
      cargar()
    } catch { alert('No se pudo actualizar el enlace') }
  }

  async function eliminarEnlace(enlace) {
    if (!confirm(`¿Eliminar este enlace${enlace.total_postulaciones > 0 ? ` y sus ${enlace.total_postulaciones} postulación(es) recibidas` : ''}? No se puede deshacer.`)) return
    try {
      await enlacesPostulacionApi.eliminar(empresaActual.id, enlace.id)
      cargar()
    } catch { alert('No se pudo eliminar el enlace') }
  }

  async function eliminarPostulacion(p) {
    if (!confirm(`¿Eliminar la postulación de ${p.nombres} ${p.apellido_paterno}?`)) return
    try {
      await postulacionesContratoApi.eliminar(empresaActual.id, p.id)
      cargar()
    } catch { alert('No se pudo eliminar la postulación') }
  }

  function usarParaContrato(p) {
    nav(`/contratos/nuevo?postulacion_id=${p.id}`)
  }

  if (!empresaActual) return <p>Selecciona una empresa.</p>

  return (
    <div>
      <div className="page-header">
        <h1>Solicitudes de Contrato</h1>
      </div>

      <div className="card" style={{marginBottom:16}}>
        <h3 style={{fontWeight:600, marginBottom:8}}>Generar enlace para {empresaActual.razon_social}</h3>
        <p style={{fontSize:13, color:'var(--gray-500)', marginBottom:12}}>
          Genera un enlace y envíaselo a los futuros trabajadores (WhatsApp, correo, etc.). Es reutilizable:
          cada persona que lo complete queda como una postulación separada abajo, sin borrar a las demás.
          Verán el nombre de tu empresa pero no podrán cambiarla ni ver otras.
        </p>
        <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
          <input className="input" style={{maxWidth:320}} placeholder="Referencia (opcional, ej: Postulación instaladores julio)"
            value={nombreReferencia} onChange={e => setNombreReferencia(e.target.value)} />
          <button className="btn btn-primary" onClick={generar} disabled={creando}>
            {creando ? 'Generando…' : '+ Generar enlace'}
          </button>
        </div>
        {error && <p style={{color:'red', marginTop:8, fontSize:13}}>{error}</p>}
      </div>

      <div className="card" style={{padding:0, marginBottom:16}}>
        <h3 style={{fontWeight:600, padding:'14px 16px 0'}}>Enlaces</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Referencia</th><th>Postulaciones</th><th>Creado</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {cargando && <tr><td colSpan={5} style={{textAlign:'center',padding:24,color:'var(--gray-500)'}}>Cargando…</td></tr>}
              {!cargando && enlaces.length === 0 && (
                <tr><td colSpan={5} style={{textAlign:'center',padding:24,color:'var(--gray-500)'}}>Sin enlaces generados todavía.</td></tr>
              )}
              {enlaces.map(e => (
                <tr key={e.id}>
                  <td>{e.nombre_referencia || '—'}</td>
                  <td>{e.total_postulaciones}</td>
                  <td className="text-muted">{new Date(e.created_at).toLocaleDateString('es-CL')}</td>
                  <td><span className={`badge ${e.activo ? 'badge-green' : 'badge-gray'}`}>{e.activo ? 'Activo' : 'Desactivado'}</span></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button className="btn btn-outline btn-sm" onClick={() => copiar(e)}>
                        {copiadoId === e.id ? '✓ Copiado' : '🔗 Copiar enlace'}
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => toggleActivo(e)}>
                        {e.activo ? 'Desactivar' : 'Reactivar'}
                      </button>
                      <button className="btn btn-outline btn-sm" style={{color:'var(--danger)'}} onClick={() => eliminarEnlace(e)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{padding:0}}>
        <h3 style={{fontWeight:600, padding:'14px 16px 0'}}>Postulaciones recibidas</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Enlace</th><th>Postulante</th><th>Estado</th><th>Recibida</th><th></th></tr>
            </thead>
            <tbody>
              {cargando && <tr><td colSpan={5} style={{textAlign:'center',padding:24,color:'var(--gray-500)'}}>Cargando…</td></tr>}
              {!cargando && postulaciones.length === 0 && (
                <tr><td colSpan={5} style={{textAlign:'center',padding:24,color:'var(--gray-500)'}}>Todavía no llega ninguna postulación.</td></tr>
              )}
              {postulaciones.map(p => (
                <tr key={p.id}>
                  <td>{p.nombre_referencia || '—'}</td>
                  <td>{p.nombres} {p.apellido_paterno}</td>
                  <td><span className={`badge ${ESTADO_BADGE[p.estado]}`}>{ESTADO_LABEL[p.estado]}</span></td>
                  <td className="text-muted">{new Date(p.created_at).toLocaleDateString('es-CL')}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {p.estado === 'ENVIADA' && (
                        <button className="btn btn-primary btn-sm" onClick={() => usarParaContrato(p)}>
                          Usar para nuevo contrato →
                        </button>
                      )}
                      {p.estado !== 'CONVERTIDA' && (
                        <button className="btn btn-outline btn-sm" style={{color:'var(--danger)'}} onClick={() => eliminarPostulacion(p)}>
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
