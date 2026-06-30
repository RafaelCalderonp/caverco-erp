import { useState, useEffect } from 'react'
import { contabilidadApi } from '../services/api'
import { useEmpresa } from '../context/EmpresaContext'

const CLP = (v) => `$${Math.round(v || 0).toLocaleString('es-CL')}`

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function aniosDisponibles() {
  const actual = new Date().getFullYear()
  const años = []
  for (let a = actual; a >= 2020; a--) años.push(a)
  return años
}

export default function Contabilidad() {
  const { empresaActual } = useEmpresa()
  const idEmpresa = empresaActual?.id

  const hoy = new Date()
  const [año, setAño] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [operacion, setOperacion] = useState('COMPRA')
  const [docs, setDocs] = useState([])

  const [archivos, setArchivos] = useState(null)
  const [cargandoArchivo, setCargandoArchivo] = useState(false)
  const [msg, setMsg] = useState(null)

  const periodo = `${año}${String(mes).padStart(2, '0')}`

  const cargarDocs = () => {
    if (!idEmpresa) return
    contabilidadApi.listarRcv(idEmpresa, periodo, operacion)
      .then(r => setDocs(r.data))
      .catch(() => setDocs([]))
  }

  useEffect(cargarDocs, [idEmpresa, periodo, operacion])

  const cargarArchivo = async () => {
    if (!archivos || archivos.length === 0) return
    setCargandoArchivo(true)
    setMsg(null)
    try {
      const r = await contabilidadApi.cargarArchivoRcv(idEmpresa, operacion, archivos)
      const totalDocs = r.data.reduce((acc, x) => acc + x.total_docs, 0)
      const totalMonto = r.data.reduce((acc, x) => acc + x.monto_total, 0)
      setMsg(
        r.data.length > 1
          ? `✅ Cargados ${r.data.length} períodos · ${totalDocs} documentos · Total ${CLP(totalMonto)}`
          : `✅ Cargados ${totalDocs} documentos · Total ${CLP(totalMonto)}`
      )
      setArchivos(null)
      cargarDocs()
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Error al cargar el archivo')
    } finally {
      setCargandoArchivo(false)
    }
  }

  const montoTotal = docs.reduce((acc, d) => acc + (d.monto_total || 0), 0)

  return (
    <div>
      <div className="page-header"><h1>Contabilidad</h1></div>

      <div className="card" style={{marginBottom: 16}}>
        <h3 style={{fontWeight:600, marginBottom:12}}>Cargar archivo RCV</h3>
        <p style={{fontSize:13, color:'var(--gray-500)', marginBottom:12}}>
          Descarga el CSV de detalle desde el portal del SII (Registro de Compras y Ventas → Detalle) y súbelo aquí.
          Puedes seleccionar varios archivos de distintos meses a la vez.
        </p>
        <div style={{display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap'}}>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Operación</label>
            <select className="input" value={operacion} onChange={e => setOperacion(e.target.value)}>
              <option value="COMPRA">Compras</option>
              <option value="VENTA">Ventas</option>
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Archivo(s) CSV</label>
            <input
              type="file"
              accept=".csv,.txt"
              multiple
              onChange={e => setArchivos(e.target.files?.length ? e.target.files : null)}
            />
          </div>
          <button className="btn btn-primary" onClick={cargarArchivo} disabled={!archivos || cargandoArchivo}>
            {cargandoArchivo ? 'Cargando…' : 'Cargar archivo(s)'}
          </button>
        </div>
        {msg && (
          <div style={{fontSize:13, marginTop:12, color: msg.startsWith('✅') ? 'var(--success)' : 'var(--danger)'}}>
            {msg}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{fontWeight:600, marginBottom:12}}>Registro de Compras y Ventas</h3>
        <div style={{display:'flex', gap:12, alignItems:'flex-end', marginBottom:16, flexWrap:'wrap'}}>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Año</label>
            <select className="input" style={{width:100}} value={año} onChange={e => setAño(Number(e.target.value))}>
              {aniosDisponibles().map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Mes</label>
            <select className="input" style={{width:130}} value={mes} onChange={e => setMes(Number(e.target.value))}>
              {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Operación</label>
            <select className="input" value={operacion} onChange={e => setOperacion(e.target.value)}>
              <option value="COMPRA">Compras</option>
              <option value="VENTA">Ventas</option>
            </select>
          </div>
        </div>

        {docs.length === 0 ? (
          <p className="text-muted">No hay documentos para {MESES[mes-1]} {año}.</p>
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
              <tr>
                <td colSpan={7} style={{textAlign:'right', fontWeight:600}}>Total</td>
                <td style={{fontWeight:600}}>{CLP(montoTotal)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
