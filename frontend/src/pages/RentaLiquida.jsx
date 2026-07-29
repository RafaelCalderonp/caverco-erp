import { useState } from 'react'
import { useEmpresa } from '../context/EmpresaContext'
import { libroDiarioApi } from '../services/api'

const AÑO_ACTUAL = new Date().getFullYear()
const AÑOS = Array.from({ length: 6 }, (_, i) => AÑO_ACTUAL - i)
const fmt = n => Number(n || 0).toLocaleString('es-CL')

export default function RentaLiquida() {
  const { empresaActual } = useEmpresa()
  const [anio, setAnio]         = useState(String(AÑO_ACTUAL))
  const [datos, setDatos]       = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError]       = useState(null)

  async function generar() {
    if (!empresaActual) return
    setCargando(true)
    setError(null)
    try {
      const r = await libroDiarioApi.rentaLiquida(empresaActual.id, anio)
      setDatos(r.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Error generando la propuesta')
    } finally { setCargando(false) }
  }

  return (
    <div>
      <h3 style={{ marginBottom: 16 }}>Propuesta BI / RLI Anual</h3>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13 }}>Año</span>
        <select value={anio} onChange={e => setAnio(e.target.value)} style={sel}>
          {AÑOS.map(a => <option key={a}>{a}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={generar} disabled={cargando}>
          {cargando ? 'Generando...' : 'Generar'}
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {datos && !datos.aplica && (
        <div style={{ background: '#fff3e0', border: '1px solid #ffb74d', borderRadius: 8, padding: 14, maxWidth: 640, fontSize: 13 }}>
          {datos.nota}
        </div>
      )}

      {datos && datos.aplica && (
        <div style={{ maxWidth: 640 }}>
          <div style={{ background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 8, padding: 4, marginBottom: 16, fontSize: 12, color: '#1565c0', textAlign: 'center' }}>
            Régimen: {datos.regimen_tributario}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 12 }}>
            <tbody>
              <tr>
                <td style={td}>Total Ingresos</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(datos.total_ingresos)}</td>
              </tr>
              <tr>
                <td style={td}>Total Egresos</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(datos.total_egresos)}</td>
              </tr>
              <tr style={{ fontWeight: 700, borderTop: '2px solid #333' }}>
                <td style={td}>{datos.etiqueta}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(datos.monto_propuesto)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ background: '#fafafa', border: '1px solid #e0e0e0', borderRadius: 8, padding: 12, fontSize: 12, color: '#666' }}>
            ⚠ {datos.nota}
          </div>
        </div>
      )}
    </div>
  )
}

const sel = { padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }
const td  = { padding: '5px 8px', verticalAlign: 'middle' }
