import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { liquidacionesApi, empleadosApi } from '../services/api'

const fmt  = n => n != null ? `$${Number(n).toLocaleString('es-CL')}` : '$0'
const pct  = n => n != null ? `${(Number(n)*100).toFixed(2)}%` : ''

export default function LiquidacionBoleta() {
  const { id }   = useParams()
  const [liq, setLiq] = useState(null)
  const [emp, setEmp] = useState(null)
  const boletaRef = useRef()

  useEffect(() => {
    liquidacionesApi.get(id).then(r => {
      setLiq(r.data)
      return empleadosApi.get(r.data.id_empleado)
    }).then(r => setEmp(r.data)).catch(() => {})
  }, [id])

  const imprimir = () => window.print()

  const descargarPDF = async () => {
    const { jsPDF } = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
    const html2canvas = (await import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')).default
    const canvas = await html2canvas(boletaRef.current, { scale: 2, useCORS: true })
    const img  = canvas.toDataURL('image/png')
    const pdf  = new jsPDF.jsPDF('p', 'mm', 'a4')
    const w    = pdf.internal.pageSize.getWidth()
    const h    = (canvas.height * w) / canvas.width
    pdf.addImage(img, 'PNG', 0, 0, w, h)
    pdf.save(`Liquidacion_${emp?.rut || id}_${liq?.periodo}.pdf`)
  }

  if (!liq || !emp) return <div className="card">Cargando liquidación…</div>

  const nombreEmp = `${emp.nombres} ${emp.apellido_paterno} ${emp.apellido_materno || ''}`.trim()
  const periodoFmt = (() => {
    const [y, m] = (liq.periodo || '').split('-')
    const meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    return `${meses[parseInt(m)] || m} ${y}`
  })()

  const habImpon = [
    ['Sueldo Base',          liq.sueldo_base],
    ['Gratificación Legal',  liq.gratificacion],
    ['Horas Extra 50%',      liq.horas_extra_50],
    ['Horas Extra 100%',     liq.horas_extra_100],
    ['Aguinaldo',            liq.aguinaldo],
  ].filter(([,v]) => v > 0)

  const habNoImpon = [
    ['Colación',             liq.colacion],
    ['Movilización',         liq.movilizacion],
    ['Viáticos',             liq.viaticos],
    ['Asignación Familiar',  liq.asig_familiar],
    ['Otros Haberes',        liq.otros_haberes],
  ].filter(([,v]) => v > 0)

  const descLeg = [
    ['AFP',                          liq.descuento_afp],
    ['Salud (7%)',                   liq.descuento_salud],
    ['Adicional Salud Isapre',       liq.adicional_salud],
    ['AFC Trabajador',               liq.afc_trabajador],
    ['Impuesto Único 2ª Cat.',       liq.impuesto_unico],
  ].filter(([,v]) => v > 0)

  const descVol = [
    ['Anticipo',   liq.anticipo],
    ['Préstamo',   liq.prestamo],
  ].filter(([,v]) => v > 0)

  const patronal = [
    ['AFC Empleador',           liq.afc_empleador],
    ['SIS (2.49%)',             liq.sis_empleador],
    ['Aporte AFP (0.1%)',       liq.aporte_empleador_afp],
    ['Seguro Social (0.9%)',    liq.seguro_social_empleador],
  ].filter(([,v]) => v > 0)

  return (
    <div>
      {/* Barra de acciones */}
      <div className="page-header no-print">
        <div className="flex items-center gap-2">
          <Link to={`/liquidaciones/${id}`} className="btn btn-outline btn-sm">← Volver</Link>
          <h1>Boleta de Liquidación #{id}</h1>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline" onClick={imprimir}>🖨️ Imprimir</button>
          <button className="btn btn-primary" onClick={descargarPDF}>⬇️ Descargar PDF</button>
        </div>
      </div>

      {/* ── BOLETA ── */}
      <div className="boleta" ref={boletaRef}>

        {/* Encabezado */}
        <div className="boleta-header">
          <div>
            <h2>LIQUIDACIÓN DE SUELDO</h2>
            <div className="sub">Período: {periodoFmt} · {liq.dias_trabajados} días trabajados</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontWeight:700,fontSize:15}}>CAVERCO ERP</div>
            <div style={{fontSize:11,color:'#9ca3af',marginTop:2}}>
              UF: {liq.valor_uf ? `$${Number(liq.valor_uf).toLocaleString('es-CL',{minimumFractionDigits:2})}` : '—'} ·
              UTM: {liq.valor_utm ? `$${Number(liq.valor_utm).toLocaleString('es-CL')}` : '—'}
            </div>
          </div>
        </div>

        {/* Datos trabajador */}
        <div className="boleta-empleado">
          {[
            ['Nombre',        nombreEmp],
            ['RUT',           emp.rut],
            ['Cargo',         emp.cargo?.nombre || '—'],
            ['Departamento',  emp.departamento?.nombre || '—'],
            ['AFP',           emp.id_afp || liq.id_afp || '—'],
            ['Salud',         emp.id_isapre || liq.id_isapre || '—'],
          ].map(([lbl, val]) => (
            <div key={lbl} className="boleta-campo">
              <div className="lbl">{lbl}</div>
              <div className="val">{val}</div>
            </div>
          ))}
        </div>

        {/* Tabla haberes + descuentos */}
        <table className="boleta-tabla">
          <tbody>
            {/* Haberes imponibles */}
            <tr className="seccion"><td colSpan={2}>Haberes Imponibles</td></tr>
            {habImpon.map(([c,v]) => (
              <tr key={c}><td>{c}</td><td>{fmt(v)}</td></tr>
            ))}
            <tr className="subtotal">
              <td>Total Imponible</td>
              <td>{fmt(liq.total_imponible)}</td>
            </tr>

            {/* Haberes no imponibles */}
            {habNoImpon.length > 0 && <>
              <tr className="seccion"><td colSpan={2}>Haberes No Imponibles</td></tr>
              {habNoImpon.map(([c,v]) => (
                <tr key={c}><td>{c}</td><td>{fmt(v)}</td></tr>
              ))}
            </>}
            <tr className="subtotal">
              <td>Total Haberes</td>
              <td>{fmt(liq.total_haberes)}</td>
            </tr>

            {/* Descuentos legales */}
            <tr className="seccion"><td colSpan={2}>Descuentos Legales</td></tr>
            {descLeg.map(([c,v]) => (
              <tr key={c} style={{color:'#991b1b'}}>
                <td>{c}</td><td>({fmt(v)})</td>
              </tr>
            ))}
            <tr><td style={{color:'#6b7280'}}>Base Tributaria</td><td>{fmt(liq.base_tributaria)}</td></tr>
            <tr className="subtotal" style={{color:'#991b1b'}}>
              <td>Total Descuentos Legales</td>
              <td>({fmt(liq.total_desc_legales)})</td>
            </tr>

            {/* Descuentos voluntarios */}
            {descVol.length > 0 && <>
              <tr className="seccion"><td colSpan={2}>Otros Descuentos</td></tr>
              {descVol.map(([c,v]) => (
                <tr key={c} style={{color:'#991b1b'}}>
                  <td>{c}</td><td>({fmt(v)})</td>
                </tr>
              ))}
              <tr className="subtotal" style={{color:'#991b1b'}}>
                <td>Total Otros Descuentos</td><td>({fmt(liq.total_otros_desc)})</td>
              </tr>
            </>}

            {/* Aportes patronales */}
            <tr className="seccion"><td colSpan={2}>Aportes Patronales (cargo empresa, referencia)</td></tr>
            {patronal.map(([c,v]) => (
              <tr key={c} className="patronal"><td>{c}</td><td>{fmt(v)}</td></tr>
            ))}
            <tr className="patronal subtotal">
              <td>Total Costo Patronal</td><td>{fmt(liq.total_costo_empleador)}</td>
            </tr>
          </tbody>
        </table>

        {/* Líquido a pagar */}
        <div className="boleta-liquido">
          <div className="label">LÍQUIDO A PAGAR</div>
          <div className="amount">{fmt(liq.liquido_a_pagar)}</div>
        </div>

        {/* Firmas */}
        <div className="boleta-footer">
          <div className="boleta-firma">
            <div className="linea">Firma Empleador / Representante Legal</div>
          </div>
          <div className="boleta-firma">
            <div className="linea">Firma Trabajador · RUT: {emp.rut}</div>
          </div>
        </div>

        {/* Pie */}
        <div style={{padding:'8px 24px',fontSize:10,color:'var(--gray-500)',
          borderTop:'1px solid var(--gray-200)',textAlign:'center'}}>
          Documento generado por Caverco ERP · {new Date().toLocaleDateString('es-CL')} ·
          Estado: <strong>{liq.estado}</strong>
          {liq.observacion && ` · Obs: ${liq.observacion}`}
        </div>
      </div>
    </div>
  )
}
