import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmpresa } from '../context/EmpresaContext'
import { solicitudesContratoApi } from '../services/api'

const ESTADO_LABEL = { PENDIENTE: 'Pendiente de envío', ENVIADA: 'Enviada por el postulante', CONVERTIDA: 'Convertida en contrato' }
const ESTADO_BADGE = { PENDIENTE: 'badge-gray', ENVIADA: 'badge-blue', CONVERTIDA: 'badge-green' }

export default function SolicitudesContrato() {
  const nav = useNavigate()
  const { empresaActual } = useEmpresa()
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [nombreReferencia, setNombreReferencia] = useState('')
  const [creando, setCreando] = useState(false)
  const [copiadoId, setCopiadoId] = useState(null)
  const [error, setError] = useState(null)

  const cargar = () => {
    if (!empresaActual) return
    setCargando(true)
    solicitudesContratoApi.listar(empresaActual.id)
      .then(r => setLista(r.data))
      .catch(() => setLista([]))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [empresaActual])

  const urlPublica = (token) => `${window.location.origin}/postulacion/${token}`

  async function generar() {
    setCreando(true); setError(null)
    try {
      await solicitudesContratoApi.crear(empresaActual.id, nombreReferencia)
      setNombreReferencia('')
      cargar()
    } catch (e) {
      setError(e.response?.data?.detail || 'Error generando el enlace')
    } finally { setCreando(false) }
  }

  async function copiar(s) {
    try {
      await navigator.clipboard.writeText(urlPublica(s.token))
      setCopiadoId(s.id)
      setTimeout(() => setCopiadoId(null), 2000)
    } catch { alert(urlPublica(s.token)) }
  }

  async function eliminar(s) {
    if (!confirm('¿Eliminar este enlace? Ya no se podrá usar para completar datos.')) return
    try {
      await solicitudesContratoApi.eliminar(empresaActual.id, s.id)
      cargar()
    } catch { alert('No se pudo eliminar') }
  }

  function usarParaContrato(s) {
    nav(`/contratos/nuevo?solicitud_id=${s.id}`)
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
          Genera un enlace y envíaselo al futuro trabajador (WhatsApp, correo, etc.). Verá el nombre de la
          empresa pero no podrá cambiarla ni ver otras empresas. Al completar sus datos personales, aparecen
          aquí para que los uses al crear el contrato.
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

      <div className="card" style={{padding:0}}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Referencia</th><th>Postulante</th><th>Estado</th><th>Creada</th><th>Enviada</th><th></th>
              </tr>
            </thead>
            <tbody>
              {cargando && <tr><td colSpan={6} style={{textAlign:'center',padding:24,color:'var(--gray-500)'}}>Cargando…</td></tr>}
              {!cargando && lista.length === 0 && (
                <tr><td colSpan={6} style={{textAlign:'center',padding:24,color:'var(--gray-500)'}}>Sin solicitudes generadas todavía.</td></tr>
              )}
              {lista.map(s => (
                <tr key={s.id}>
                  <td>{s.nombre_referencia || '—'}</td>
                  <td>{s.nombres ? `${s.nombres} ${s.apellido_paterno || ''}` : <span style={{color:'var(--gray-400)'}}>Sin completar</span>}</td>
                  <td><span className={`badge ${ESTADO_BADGE[s.estado]}`}>{ESTADO_LABEL[s.estado]}</span></td>
                  <td className="text-muted">{new Date(s.created_at).toLocaleDateString('es-CL')}</td>
                  <td className="text-muted">{s.enviado_at ? new Date(s.enviado_at).toLocaleDateString('es-CL') : '—'}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {s.estado !== 'CONVERTIDA' && (
                        <button className="btn btn-outline btn-sm" onClick={() => copiar(s)}>
                          {copiadoId === s.id ? '✓ Copiado' : '🔗 Copiar enlace'}
                        </button>
                      )}
                      {s.estado === 'ENVIADA' && (
                        <button className="btn btn-primary btn-sm" onClick={() => usarParaContrato(s)}>
                          Usar para nuevo contrato →
                        </button>
                      )}
                      {s.estado !== 'CONVERTIDA' && (
                        <button className="btn btn-outline btn-sm" style={{color:'var(--danger)'}} onClick={() => eliminar(s)}>
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
