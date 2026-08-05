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

function Grupo({ titulo, filas, total, destacado }) {
  if (filas.length === 0 && Number(total) === 0) return null
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontWeight: 600, fontSize: 12, color: '#555', margin: '10px 0 4px' }}>{titulo}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          {filas.map(f => (
            <tr key={f.id_cuenta} style={{ borderBottom: '1px solid #f5f5f5' }}>
              <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, width: 90 }}>{f.codigo}</td>
              <td style={td}>{f.nombre}</td>
              <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(f.monto)}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: destacado ? 700 : 600, borderTop: '1px solid #ddd' }}>
            <td colSpan={2} style={{ ...td, textAlign: 'right' }}>Total {titulo}</td>
            <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function BalanceClasificado() {
  const { empresaActual } = useEmpresa()
  const [año, setAño] = useState(String(AÑO_ACTUAL))
  const [mes, setMes] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  async function generar() {
    if (!empresaActual) return
    setCargando(true)
    setError(null)
    try {
      const r = await libroDiarioApi.balanceClasificado(empresaActual.id, `${año}${mes}`)
      setDatos(r.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Error generando el balance clasificado')
    } finally { setCargando(false) }
  }

  return (
    <div>
      <h3 style={{ marginBottom: 16 }}>Balance Clasificado</h3>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13 }}>Al</span>
        <select value={mes} onChange={e => setMes(e.target.value)} style={sel}>
          {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
        <select value={año} onChange={e => setAño(e.target.value)} style={sel}>
          {AÑOS.map(a => <option key={a}>{a}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={generar} disabled={cargando}>
          {cargando ? 'Generando...' : 'Generar'}
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {datos && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, maxWidth: 1000 }}>
          <div>
            <h4 style={{ margin: '0 0 4px', color: '#1565c0', borderBottom: '2px solid #1565c0', paddingBottom: 4 }}>Activos</h4>
            <Grupo titulo="Activo Corriente" filas={datos.activo_corriente} total={datos.total_activo_corriente} />
            <Grupo titulo="Activo No Corriente" filas={datos.activo_no_corriente} total={datos.total_activo_no_corriente} />
            <Grupo titulo="Otros Activos" filas={datos.activo_otros} total={datos.total_activo_otros} />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: 8, borderTop: '2px solid #1565c0', fontWeight: 700 }}>
              <span>Total Activos</span>
              <span style={{ fontFamily: 'monospace' }}>{fmt(datos.total_activos)}</span>
            </div>
          </div>

          <div>
            <h4 style={{ margin: '0 0 4px', color: '#c62828', borderBottom: '2px solid #c62828', paddingBottom: 4 }}>Pasivos y Patrimonio</h4>
            <Grupo titulo="Pasivo Corriente" filas={datos.pasivo_corriente} total={datos.total_pasivo_corriente} />
            <Grupo titulo="Pasivo No Corriente" filas={datos.pasivo_no_corriente} total={datos.total_pasivo_no_corriente} />
            <Grupo titulo="Otros Pasivos" filas={datos.pasivo_otros} total={datos.total_pasivo_otros} />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontWeight: 600, borderTop: '1px solid #ddd' }}>
              <span>Total Pasivos</span>
              <span style={{ fontFamily: 'monospace' }}>{fmt(datos.total_pasivos)}</span>
            </div>

            <Grupo titulo="Patrimonio" filas={datos.patrimonio} total={datos.total_patrimonio_cuentas} />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 13 }}>
              <span>Resultado del Ejercicio (no cerrado)</span>
              <span style={{ fontFamily: 'monospace' }}>{fmt(datos.resultado_ejercicio)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontWeight: 600, borderTop: '1px solid #ddd' }}>
              <span>Total Patrimonio</span>
              <span style={{ fontFamily: 'monospace' }}>{fmt(datos.total_patrimonio)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: 8, borderTop: '2px solid #c62828', fontWeight: 700 }}>
              <span>Total Pasivo + Patrimonio</span>
              <span style={{ fontFamily: 'monospace' }}>{fmt(datos.total_pasivo_patrimonio)}</span>
            </div>
          </div>

          {Number(datos.diferencia) !== 0 && (
            <div style={{ gridColumn: '1 / -1', background: '#fff3e0', border: '1px solid #ffb74d', borderRadius: 8, padding: 10, fontSize: 13 }}>
              ⚠ El balance no cuadra: diferencia de {fmt(datos.diferencia)}. Revisa asientos no contabilizados o cuentas mal clasificadas.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const sel = { padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }
const td  = { padding: '4px 8px', verticalAlign: 'middle' }
