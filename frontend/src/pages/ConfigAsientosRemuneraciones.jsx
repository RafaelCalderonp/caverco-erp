import { useEffect, useState, useCallback } from 'react'
import { useEmpresa } from '../context/EmpresaContext'
import { planCuentasApi, remuneracionesContabilidadApi } from '../services/api'

const CAMPOS = [
  { key: 'id_cuenta_gasto_remuneraciones',          label: 'Gasto: Sueldos y Haberes Imponibles', grupo: 'Gastos (DEBE)' },
  { key: 'id_cuenta_gasto_colacion_movilizacion',   label: 'Gasto: Colación, Movilización y Viáticos', grupo: 'Gastos (DEBE)' },
  { key: 'id_cuenta_gasto_cotizaciones_patronales', label: 'Gasto: Aportes Patronales (AFC/SIS/Seg. Social)', grupo: 'Gastos (DEBE)' },
  { key: 'id_cuenta_previred_por_pagar',            label: 'Previred por Pagar (AFP/SIS/Seg. Social/AFC/Salud)', grupo: 'Pasivos (HABER)' },
  { key: 'id_cuenta_impuesto_unico_por_pagar',      label: 'Impuesto Único por Pagar (SII)', grupo: 'Pasivos (HABER)' },
  { key: 'id_cuenta_anticipos_prestamos',           label: 'Anticipos y Préstamos a Trabajadores', grupo: 'Pasivos (HABER)' },
  { key: 'id_cuenta_remuneraciones_por_pagar',      label: 'Remuneraciones por Pagar', grupo: 'Pasivos (HABER)' },
  { key: 'id_cuenta_banco',                          label: 'Banco Santander Cta. Cte. (pago)', grupo: 'Pago' },
]

export default function ConfigAsientosRemuneraciones() {
  const { empresaActual } = useEmpresa()
  const [cuentas, setCuentas] = useState([])
  const [form, setForm]       = useState({})
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg]         = useState(null)
  const [error, setError]     = useState(null)

  const cargar = useCallback(async () => {
    if (!empresaActual) return
    setCargando(true)
    try {
      const [cCuentas, cConfig] = await Promise.all([
        planCuentasApi.list(empresaActual.id, false),
        remuneracionesContabilidadApi.obtenerConfig(empresaActual.id),
      ])
      setCuentas(cCuentas.data)
      setForm(cConfig.data)
    } catch {
      setError('No se pudo cargar la configuración')
    } finally { setCargando(false) }
  }, [empresaActual])

  useEffect(() => { cargar() }, [cargar])

  async function guardar() {
    setGuardando(true); setMsg(null); setError(null)
    try {
      const payload = {}
      for (const c of CAMPOS) payload[c.key] = form[c.key] || null
      const r = await remuneracionesContabilidadApi.guardarConfig(empresaActual.id, payload)
      setForm(r.data)
      setMsg(r.data.completa ? '✅ Configuración guardada y completa' : '⚠ Guardado, pero aún faltan cuentas por definir')
    } catch (e) {
      setError(e.response?.data?.detail || 'Error guardando la configuración')
    } finally { setGuardando(false) }
  }

  if (!empresaActual) return <p>Selecciona una empresa.</p>
  if (cargando) return <p>Cargando...</p>

  const cuentasDetalle = cuentas.filter(c => c.nivel === 'D')
  let grupoActual = null

  return (
    <div style={{ maxWidth: 620 }}>
      <h3 style={{ marginBottom: 8 }}>Config. Asientos de Remuneraciones — {empresaActual.razon_social}</h3>
      <p style={{ fontSize: 12, color: '#666', marginBottom: 20 }}>
        Define qué cuenta del Plan de Cuentas usa cada concepto. Con esto, desde Liquidaciones podrás
        generar automáticamente el asiento de provisión (devengo del gasto) y el asiento de pago
        (cancelación vía Banco Santander) de cada período.
      </p>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {msg    && <p style={{ color: msg.startsWith('✅') ? 'green' : '#e65100' }}>{msg}</p>}

      {CAMPOS.map(c => {
        const mostrarGrupo = c.grupo !== grupoActual
        grupoActual = c.grupo
        return (
          <div key={c.key}>
            {mostrarGrupo && (
              <h4 style={{ margin: '18px 0 8px', fontSize: 13, color: '#555', borderBottom: '1px solid #eee', paddingBottom: 4 }}>
                {c.grupo}
              </h4>
            )}
            <div className="form-group">
              <label className="form-label">{c.label}</label>
              <select className="input" value={form[c.key] || ''}
                onChange={e => setForm(f => ({ ...f, [c.key]: e.target.value ? Number(e.target.value) : null }))}>
                <option value="">— seleccionar cuenta —</option>
                {cuentasDetalle.map(cta => (
                  <option key={cta.id} value={cta.id}>{cta.codigo} — {cta.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        )
      })}

      <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={guardar} disabled={guardando}>
        {guardando ? 'Guardando...' : 'Guardar Configuración'}
      </button>
    </div>
  )
}
