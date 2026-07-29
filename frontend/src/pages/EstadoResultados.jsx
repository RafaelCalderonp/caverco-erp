import { useState } from 'react'
import { useEmpresa } from '../context/EmpresaContext'
import { libroDiarioApi } from '../services/api'

const AÑO_ACTUAL = new Date().getFullYear()
const AÑOS = Array.from({ length: 6 }, (_, i) => AÑO_ACTUAL - i)
const MESES = [
  { v: '01', l: 'Enero' }, { v: '02', l: 'Febrero' }, { v: '03', l: 'Marzo' },
  { v: '04', l: 'Abril' }, { v: '05', l: 'Mayo' },    { v: '06', l: 'Junio' },
  { v: '07', l: 'Julio' }, { v: '08', l: 'Agosto' },  { v: '09', l: 'Septiembre' },
  { v: '10', l: 'Octubre' },{ v: '11', l: 'Noviembre'},{ v: '12', l: 'Diciembre' },
]

const fmt = n => Number(n || 0).toLocaleString('es-CL')

function Bloque({ titulo, color, filas, total }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h4 style={{ margin: '0 0 8px', color, borderBottom: `2px solid ${color}`, paddingBottom: 4 }}>{titulo}</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          {filas.length === 0 && (
            <tr><td style={{ ...td, color: '#888', textAlign: 'center' }} colSpan={3}>Sin movimientos</td></tr>
          )}
          {filas.map(f => (
            <tr key={f.id_cuenta} style={{ borderBottom: '1px solid #f5f5f5' }}>
              <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, width: 90 }}>{f.codigo}</td>
              <td style={td}>{f.nombre}</td>
              <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(f.monto)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: 700, borderTop: `1px solid ${color}` }}>
            <td colSpan={2} style={{ ...td, textAlign: 'right' }}>Total {titulo}</td>
            <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default function EstadoResultados() {
  const { empresaActual } = useEmpresa()
  const [año, setAño]           = useState(String(AÑO_ACTUAL))
  const [mesDesde, setMesDesde] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [mesHasta, setMesHasta] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [datos, setDatos]       = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError]       = useState(null)

  async function generar() {
    if (!empresaActual) return
    setCargando(true)
    setError(null)
    try {
      const desde = `${año}${mesDesde}`
      const hasta = `${año}${mesHasta}`
      const r = await libroDiarioApi.estadoResultados(empresaActual.id, desde, hasta)
      setDatos(r.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Error generando el estado de resultados')
    } finally { setCargando(false) }
  }

  return (
    <div>
      <h3 style={{ marginBottom: 16 }}>Estado de Resultados</h3>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={año} onChange={e => setAño(e.target.value)} style={sel}>
          {AÑOS.map(a => <option key={a}>{a}</option>)}
        </select>
        <span style={{ fontSize: 13 }}>Desde</span>
        <select value={mesDesde} onChange={e => setMesDesde(e.target.value)} style={sel}>
          {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
        <span style={{ fontSize: 13 }}>Hasta</span>
        <select value={mesHasta} onChange={e => setMesHasta(e.target.value)} style={sel}>
          {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={generar} disabled={cargando}>
          {cargando ? 'Generando...' : 'Generar'}
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {datos && (
        <div style={{ maxWidth: 640 }}>
          <Bloque titulo="Ingresos" color="#2e7d32" filas={datos.ingresos} total={datos.total_ingresos} />
          <Bloque titulo="Costos y Gastos" color="#c62828" filas={datos.egresos} total={datos.total_egresos} />
          <div style={{
            display: 'flex', justifyContent: 'space-between', padding: '12px 8px',
            marginTop: 8, borderTop: '2px solid #333', fontWeight: 700, fontSize: 15,
          }}>
            <span>{Number(datos.resultado) >= 0 ? 'Utilidad del Período' : 'Pérdida del Período'}</span>
            <span style={{ fontFamily: 'monospace', color: Number(datos.resultado) >= 0 ? '#2e7d32' : '#c62828' }}>
              {fmt(datos.resultado)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

const sel = { padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }
const td  = { padding: '5px 8px', verticalAlign: 'middle' }
