import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { credencialesApi, contabilidadApi } from '../services/api'
import { useEmpresa } from '../context/EmpresaContext'
import { useAuth } from '../context/AuthContext'

function periodoActual() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
}

const CLP = (v) => `$${Math.round(v || 0).toLocaleString('es-CL')}`

export default function Contabilidad() {
  const { empresaActual } = useEmpresa()
  const { usuario } = useAuth()
  const esSuperAdmin = usuario?.rol === 'SUPERADMIN'
  const idEmpresa = empresaActual?.id

  const [credSii, setCredSii] = useState(null)

  const [periodo, setPeriodo] = useState(periodoActual())
  const [operacion, setOperacion] = useState('COMPRA')
  const [docs, setDocs] = useState([])
  const [importando, setImportando] = useState(false)
  const [importMsg, setImportMsg] = useState(null)

  const cargarCredencial = () => {
    if (!idEmpresa || !esSuperAdmin) return
    credencialesApi.list(idEmpresa).then(r => {
      setCredSii(r.data.find(c => c.tipo === 'SII') || null)
    }).catch(() => {})
  }

  const cargarDocs = () => {
    if (!idEmpresa) return
    contabilidadApi.listarRcv(idEmpresa, periodo, operacion).then(r => setDocs(r.data)).catch(() => setDocs([]))
  }

  useEffect(cargarCredencial, [idEmpresa])
  useEffect(cargarDocs, [idEmpresa, periodo, operacion])

  const importar = async () => {
    setImportando(true)
    setImportMsg(null)
    try {
      const r = await contabilidadApi.importarRcv(idEmpresa, periodo, operacion)
      setImportMsg(`✅ Importados ${r.data.total_docs} documentos · Total ${CLP(r.data.monto_total)}`)
      cargarDocs()
    } catch (err) {
      setImportMsg(err.response?.data?.detail || 'Error al importar desde el SII')
    } finally {
      setImportando(false)
    }
  }

  const montoTotal = docs.reduce((acc, d) => acc + (d.monto_total || 0), 0)

  return (
    <div>
      <div className="page-header"><h1>Contabilidad</h1></div>

      {esSuperAdmin && (
        <div style={{fontSize:12, color:'var(--gray-500)', marginBottom:16}}>
          Credencial SII: {credSii ? <strong>configurada ({credSii.usuario})</strong> : <strong>no configurada</strong>}
          {' · '}<Link to="/empresas">Administrar en Empresas</Link>
        </div>
      )}

      <div className="card">
        <h3 style={{fontWeight:600, marginBottom:12}}>Registro de Compras y Ventas</h3>
        <div style={{display:'flex', gap:12, alignItems:'flex-end', marginBottom:16, flexWrap:'wrap'}}>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Período (YYYYMM)</label>
            <input className="input" style={{width:120}} value={periodo} onChange={e => setPeriodo(e.target.value)} />
          </div>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Operación</label>
            <select className="input" value={operacion} onChange={e => setOperacion(e.target.value)}>
              <option value="COMPRA">Compras</option>
              <option value="VENTA">Ventas</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={importar} disabled={importando || (esSuperAdmin && !credSii)}>
            {importando ? 'Importando…' : 'Importar desde SII'}
          </button>
        </div>

        {esSuperAdmin && !credSii && <p style={{fontSize:12, color:'var(--gray-500)', marginBottom:12}}>Configura la credencial SII en Empresas para poder importar.</p>}
        {importMsg && <div style={{fontSize:13, marginBottom:12, color: importMsg.startsWith('✅') ? 'var(--success)' : 'var(--danger)'}}>{importMsg}</div>}

        {docs.length === 0 ? (
          <p className="text-muted">No hay documentos importados para este período.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Tipo Doc</th><th>RUT</th><th>Razón Social</th><th>Folio</th>
                <th>Fecha</th><th>Neto</th><th>IVA</th><th>Total</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d, i) => (
                <tr key={i}>
                  <td>{d.tipo_doc}</td>
                  <td>{d.rut_contraparte}</td>
                  <td>{d.razon_social}</td>
                  <td>{d.folio}</td>
                  <td>{d.fecha_docto}</td>
                  <td>{CLP(d.monto_neto)}</td>
                  <td>{CLP(d.monto_iva)}</td>
                  <td>{CLP(d.monto_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={7} style={{textAlign:'right', fontWeight:600}}>Total</td><td style={{fontWeight:600}}>{CLP(montoTotal)}</td></tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
