import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { liquidacionesApi } from '../services/api'

const fmt = n => n != null ? `$${Number(n).toLocaleString('es-CL')}` : '—'
const estadoBadge = e => ({ BORRADOR:'badge-gray', EMITIDA:'badge-blue', PAGADA:'badge-green' }[e]||'badge-gray')

export default function LiquidacionDetalle() {
  const { id } = useParams()
  const [liq, setLiq] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    liquidacionesApi.get(id).then(r => setLiq(r.data)).catch(() => {})
  }, [id])

  const descargarWord = async () => {
    try {
      const r = await liquidacionesApi.descargarWord(id)
      const disposition = r.headers['content-disposition'] || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const nombre = match ? match[1] : `liquidacion_${id}.docx`
      const url = URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      a.href = url; a.download = nombre
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch(err) {
      let msg = 'Error al generar el Word'
      if (err.response?.data instanceof Blob) {
        try { const t = await err.response.data.text(); msg = JSON.parse(t).detail || msg } catch {}
      }
      setMsg(msg)
    }
  }

  const pagar = async () => {
    try {
      const r = await liquidacionesApi.marcarPagada(id)
      setLiq(r.data); setMsg('✅ Marcada como pagada')
    } catch(e) {
      setMsg(e.response?.data?.detail || 'Error')
    }
  }

  if (!liq) return <div className="card">Cargando…</div>

  return (
    <div style={{maxWidth:720}}>
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Link to="/liquidaciones" className="btn btn-outline btn-sm">← Volver</Link>
          <h1>Liquidación #{liq.id}</h1>
          <span className={`badge ${estadoBadge(liq.estado)}`}>{liq.estado}</span>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline" onClick={descargarWord}>⬇️ Descargar Word</button>
          <Link to={`/liquidaciones/${id}/boleta`} className="btn btn-outline">🖨️ Ver Boleta</Link>
          {liq.estado === 'EMITIDA' && (
            <button className="btn btn-primary" onClick={pagar}>Marcar como Pagada</button>
          )}
        </div>
      </div>

      {msg && <div style={{padding:'10px 14px',borderRadius:6,marginBottom:12,
        background: msg.startsWith('✅') ? '#dcfce7' : '#fee2e2',
        color:      msg.startsWith('✅') ? '#15803d' : '#b91c1c'}}>{msg}</div>}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
        {[['Empleado', liq.nombre_empleado || `#${liq.id_empleado}`],['Período',liq.periodo],
          ['Días Trabajados',liq.dias_trabajados],['UF',liq.valor_uf&&`$${Number(liq.valor_uf).toLocaleString('es-CL',{minimumFractionDigits:2})}`]
        ].map(([k,v])=>(
          <div key={k} style={{background:'var(--gray-50)',borderRadius:6,padding:'10px 14px'}}>
            <div style={{fontSize:11,color:'var(--gray-500)',fontWeight:600,textTransform:'uppercase'}}>{k}</div>
            <div style={{fontWeight:600,marginTop:2}}>{v||'—'}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{marginBottom:12}}>
        <h3 style={{fontWeight:600,marginBottom:12}}>Haberes</h3>
        {[
          ['Sueldo Base', liq.sueldo_base],
          ['Gratificación', liq.gratificacion],
          ['HH.EE 50%', liq.horas_extra_50],
          ['HH.EE 100%', liq.horas_extra_100],
          ['Aguinaldo', liq.aguinaldo],
          ['Colación', liq.colacion],
          ['Movilización', liq.movilizacion],
          ['Viáticos', liq.viaticos],
          ['Asig. Familiar', liq.asig_familiar],
        ].filter(([,v])=>v>0).map(([k,v])=>(
          <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid var(--gray-100)'}}>
            <span className="text-muted">{k}</span><span>{fmt(v)}</span>
          </div>
        ))}
        <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',fontWeight:700}}>
          <span>Total Haberes</span><span>{fmt(liq.total_haberes)}</span>
        </div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <h3 style={{fontWeight:600,marginBottom:12,color:'var(--danger)'}}>Descuentos Legales</h3>
        {[
          ['AFP', liq.descuento_afp],
          ['Salud (7%)', liq.descuento_salud],
          ['Adicional Salud', liq.adicional_salud],
          ['Seg. Cesantía', liq.afc_trabajador],
          ['Base Tributaria', liq.base_tributaria, false],
          ['Impuesto Único', liq.impuesto_unico],
        ].map(([k,v,red=true])=>(
          <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid var(--gray-100)'}}>
            <span className="text-muted">{k}</span>
            <span style={{color: red&&v>0?'var(--danger)':'inherit'}}>{red&&v>0?'-':''}{fmt(v)}</span>
          </div>
        ))}
        <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',fontWeight:700,color:'var(--danger)'}}>
          <span>Total Descuentos</span><span>-{fmt(liq.total_desc_legales)}</span>
        </div>
      </div>

      {(liq.anticipo>0||liq.prestamo>0) && (
        <div className="card" style={{marginBottom:12}}>
          <h3 style={{fontWeight:600,marginBottom:12}}>Otros Descuentos</h3>
          {liq.anticipo>0 && <div style={{display:'flex',justifyContent:'space-between',padding:'5px 0'}}>
            <span className="text-muted">Anticipo</span><span style={{color:'var(--danger)'}}>-{fmt(liq.anticipo)}</span>
          </div>}
          {liq.prestamo>0 && <div style={{display:'flex',justifyContent:'space-between',padding:'5px 0'}}>
            <span className="text-muted">Préstamo</span><span style={{color:'var(--danger)'}}>-{fmt(liq.prestamo)}</span>
          </div>}
        </div>
      )}

      <div style={{background:'var(--primary)',color:'#fff',borderRadius:'var(--radius)',padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontWeight:600,fontSize:15}}>LÍQUIDO A PAGAR</span>
        <span style={{fontSize:24,fontWeight:700}}>{fmt(liq.liquido_a_pagar)}</span>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <h3 style={{fontWeight:600,marginBottom:12,color:'var(--primary)'}}>Aportes Patronales (cargo empresa)</h3>
        {[
          ['AFC Empleador (3%)',   liq.afc_empleador],
          ['SIS (2.49%)',          liq.sis_empleador],
          ['Aporte AFP (0.1%)',    liq.aporte_empleador_afp],
          ['Seguro Social (0.9%)',liq.seguro_social_empleador],
        ].map(([k,v])=>(
          <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid var(--gray-100)'}}>
            <span className="text-muted">{k}</span><span>{fmt(v)}</span>
          </div>
        ))}
        <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',fontWeight:700}}>
          <span>Total Costo Patronal</span><span>{fmt(liq.total_costo_empleador)}</span>
        </div>
      </div>

      {liq.observacion && (
        <div style={{marginTop:12,padding:'10px 14px',background:'var(--gray-100)',borderRadius:6,fontSize:13}}>
          <strong>Obs:</strong> {liq.observacion}
        </div>
      )}
    </div>
  )
}
