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

function Totales({ filas, campo }) {
  return fmt(filas.reduce((s, f) => s + Number(f[campo] || 0), 0))
}

export default function Balance8Columnas() {
  const { empresaActual } = useEmpresa()
  const [año, setAño]           = useState(String(AÑO_ACTUAL))
  const [mesDesde, setMesDesde] = useState('01')
  const [mesHasta, setMesHasta] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [filas, setFilas]       = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError]       = useState(null)
  const [generado, setGenerado] = useState(false)

  async function generar() {
    if (!empresaActual) return
    setCargando(true)
    setError(null)
    try {
      const desde = `${año}${mesDesde}`
      const hasta = `${año}${mesHasta}`
      const r = await libroDiarioApi.balance8Columnas(empresaActual.id, desde, hasta)
      setFilas(r.data)
      setGenerado(true)
    } catch (e) {
      setError(e.response?.data?.detail || 'Error generando balance')
    } finally { setCargando(false) }
  }

  const colStyle = (n) => ({ ...td, textAlign: 'right', fontFamily: 'monospace', color: Number(n) > 0 ? 'inherit' : '#ccc' })

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
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
          {cargando ? 'Generando...' : 'Generar Balance'}
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {generado && filas.length === 0 && (
        <p style={{ color: '#888' }}>No hay asientos contabilizados en el período seleccionado.</p>
      )}

      {filas.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: 900 }}>
            <thead>
              <tr style={{ background: '#1a73e8', color: 'white' }}>
                <th style={{ ...th, color: 'white' }} rowSpan={2}>Cód</th>
                <th style={{ ...th, color: 'white', minWidth: 200 }} rowSpan={2}>Cuenta</th>
                <th style={{ ...th, color: 'white', textAlign: 'center' }} colSpan={2}>Sumas</th>
                <th style={{ ...th, color: 'white', textAlign: 'center' }} colSpan={2}>Saldos</th>
                <th style={{ ...th, color: 'white', textAlign: 'center' }} colSpan={2}>Inventario</th>
                <th style={{ ...th, color: 'white', textAlign: 'center' }} colSpan={2}>Resultado</th>
              </tr>
              <tr style={{ background: '#1565c0', color: 'white' }}>
                <th style={{ ...th, color: 'white', textAlign: 'right' }}>DEBE</th>
                <th style={{ ...th, color: 'white', textAlign: 'right' }}>HABER</th>
                <th style={{ ...th, color: 'white', textAlign: 'right' }}>DEUDOR</th>
                <th style={{ ...th, color: 'white', textAlign: 'right' }}>ACREEDOR</th>
                <th style={{ ...th, color: 'white', textAlign: 'right' }}>ACTIVO</th>
                <th style={{ ...th, color: 'white', textAlign: 'right' }}>PASIVO</th>
                <th style={{ ...th, color: 'white', textAlign: 'right' }}>PÉRDIDAS</th>
                <th style={{ ...th, color: 'white', textAlign: 'right' }}>GANANCIAS</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(f => (
                <tr key={f.id_cuenta} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 11 }}>{f.codigo}</td>
                  <td style={td}>{f.nombre}</td>
                  <td style={colStyle(f.suma_debe)}>{fmt(f.suma_debe)}</td>
                  <td style={colStyle(f.suma_haber)}>{fmt(f.suma_haber)}</td>
                  <td style={colStyle(f.saldo_deudor)}>{Number(f.saldo_deudor) > 0 ? fmt(f.saldo_deudor) : ''}</td>
                  <td style={colStyle(f.saldo_acreedor)}>{Number(f.saldo_acreedor) > 0 ? fmt(f.saldo_acreedor) : ''}</td>
                  <td style={colStyle(f.activo)}>{Number(f.activo) > 0 ? fmt(f.activo) : ''}</td>
                  <td style={colStyle(f.pasivo)}>{Number(f.pasivo) > 0 ? fmt(f.pasivo) : ''}</td>
                  <td style={colStyle(f.perdidas)}>{Number(f.perdidas) > 0 ? fmt(f.perdidas) : ''}</td>
                  <td style={colStyle(f.ganancias)}>{Number(f.ganancias) > 0 ? fmt(f.ganancias) : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, borderTop: '2px solid #1a73e8', background: '#f5f5f5' }}>
                <td colSpan={2} style={{ ...td, textAlign: 'right' }}>TOTALES</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}><Totales filas={filas} campo="suma_debe" /></td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}><Totales filas={filas} campo="suma_haber" /></td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}><Totales filas={filas} campo="saldo_deudor" /></td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}><Totales filas={filas} campo="saldo_acreedor" /></td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}><Totales filas={filas} campo="activo" /></td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}><Totales filas={filas} campo="pasivo" /></td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}><Totales filas={filas} campo="perdidas" /></td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}><Totales filas={filas} campo="ganancias" /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

const sel = { padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }
const th  = { textAlign: 'left', padding: '7px 8px', fontWeight: 600, fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.2)' }
const td  = { padding: '5px 8px', verticalAlign: 'middle' }
