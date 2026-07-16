import { useEffect, useState, useCallback } from 'react'
import { useEmpresa } from '../context/EmpresaContext'
import { plantillasApi, planCuentasApi } from '../services/api'

const MESES = [
  { v: '01', l: 'Enero' }, { v: '02', l: 'Febrero' }, { v: '03', l: 'Marzo' },
  { v: '04', l: 'Abril' }, { v: '05', l: 'Mayo' },    { v: '06', l: 'Junio' },
  { v: '07', l: 'Julio' }, { v: '08', l: 'Agosto' },  { v: '09', l: 'Septiembre' },
  { v: '10', l: 'Octubre' },{ v: '11', l: 'Noviembre'},{ v: '12', l: 'Diciembre' },
]
const AÑO_ACTUAL = new Date().getFullYear()
const AÑOS = Array.from({ length: 6 }, (_, i) => AÑO_ACTUAL - i)
const fmt = n => Number(n || 0).toLocaleString('es-CL')

const formVacio = { rut: '', nombre: '', tipo: 'PROVEEDOR', id_cuenta_debe: '', id_cuenta_haber: '' }

export default function PlantillasContabilizacion() {
  const { empresaActual } = useEmpresa()
  const [tab, setTab]             = useState('plantillas') // plantillas | generar
  const [plantillas, setPlantillas] = useState([])
  const [cuentas, setCuentas]     = useState([])
  const [form, setForm]           = useState(formVacio)
  const [editando, setEditando]   = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState(null)
  const [ok, setOk]               = useState(null)

  // generar asientos
  const [año, setAño]         = useState(String(AÑO_ACTUAL))
  const [mes, setMes]         = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [operacion, setOp]    = useState('COMPRA')
  const [fechaAsiento, setFechaAsiento] = useState('')
  const [rutsRcv, setRutsRcv] = useState([])
  const [resultado, setResultado] = useState(null)
  const [generando, setGenerando] = useState(false)

  const periodo = `${año}${mes}`

  const cargarPlantillas = useCallback(async () => {
    if (!empresaActual) return
    try {
      const r = await plantillasApi.listar(empresaActual.id)
      setPlantillas(r.data)
    } catch { setError('Error cargando plantillas') }
  }, [empresaActual])

  useEffect(() => { cargarPlantillas() }, [cargarPlantillas])
  useEffect(() => {
    planCuentasApi.list().then(r => setCuentas(r.data)).catch(() => {})
  }, [])

  const cuentasDetalle = cuentas.filter(c => c.nivel === 'D')

  function iniciarEdicion(p) {
    setEditando(p.id)
    setForm({ rut: p.rut, nombre: p.nombre || '', tipo: p.tipo, id_cuenta_debe: p.id_cuenta_debe, id_cuenta_haber: p.id_cuenta_haber })
    setError(null); setOk(null)
  }

  function cancelar() { setEditando(null); setForm(formVacio); setError(null) }

  async function guardar() {
    setGuardando(true); setError(null); setOk(null)
    try {
      const payload = { ...form, id_cuenta_debe: parseInt(form.id_cuenta_debe), id_cuenta_haber: parseInt(form.id_cuenta_haber) }
      if (editando) {
        await plantillasApi.actualizar(empresaActual.id, editando, payload)
      } else {
        await plantillasApi.crear(empresaActual.id, payload)
      }
      setOk('Plantilla guardada')
      setEditando(null); setForm(formVacio)
      cargarPlantillas()
    } catch (e) {
      setError(e.response?.data?.detail || 'Error guardando')
    } finally { setGuardando(false) }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta plantilla?')) return
    try {
      await plantillasApi.eliminar(empresaActual.id, id)
      cargarPlantillas()
    } catch { alert('Error eliminando') }
  }

  async function cargarRutsRcv() {
    try {
      const r = await plantillasApi.rutsRcv(empresaActual.id, periodo, operacion)
      setRutsRcv(r.data)
    } catch { setRutsRcv([]) }
  }

  useEffect(() => {
    if (tab === 'generar' && empresaActual) cargarRutsRcv()
  }, [tab, periodo, operacion, empresaActual])

  async function generar() {
    setGenerando(true); setError(null); setResultado(null)
    try {
      const r = await plantillasApi.generarAsientos(empresaActual.id, { periodo, operacion, fecha_asiento: fechaAsiento })
      setResultado(r.data)
      cargarRutsRcv()
    } catch (e) {
      setError(e.response?.data?.detail || 'Error generando asientos')
    } finally { setGenerando(false) }
  }

  const rutsSinPlantilla = rutsRcv.filter(r => !plantillas.some(p => p.rut === r.rut))
  const rutsConPlantilla = rutsRcv.filter(r =>  plantillas.some(p => p.rut === r.rut))

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e0e0e0', marginBottom: 20 }}>
        {[['plantillas','Plantillas por RUT'],['generar','Generar desde RCV']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '8px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === k ? 700 : 400,
            borderBottom: tab === k ? '2px solid #1a73e8' : '2px solid transparent',
            background: 'none', color: tab === k ? '#1a73e8' : '#555', marginBottom: -2,
          }}>{l}</button>
        ))}
      </div>

      {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}
      {ok    && <p style={{ color: 'green', marginBottom: 12 }}>{ok}</p>}

      {/* ── TAB PLANTILLAS ── */}
      {tab === 'plantillas' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
          {/* Lista */}
          <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={th}>RUT</th>
                <th style={th}>Nombre</th>
                <th style={th}>Tipo</th>
                <th style={th}>Cta. Debe</th>
                <th style={th}>Cta. Haber</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {plantillas.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#888' }}>Sin plantillas. Agrega la primera.</td></tr>
              )}
              {plantillas.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={td}><code style={{ fontSize: 12 }}>{p.rut}</code></td>
                  <td style={td}>{p.nombre || '—'}</td>
                  <td style={td}>
                    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10,
                      background: p.tipo === 'PROVEEDOR' ? '#fce4ec' : '#e3f2fd',
                      color: p.tipo === 'PROVEEDOR' ? '#c62828' : '#1565c0' }}>
                      {p.tipo}
                    </span>
                  </td>
                  <td style={{ ...td, fontSize: 12 }}><code>{p.cuenta_debe.codigo}</code> {p.cuenta_debe.nombre}</td>
                  <td style={{ ...td, fontSize: 12 }}><code>{p.cuenta_haber.codigo}</code> {p.cuenta_haber.nombre}</td>
                  <td style={td}>
                    <button style={btnLink} onClick={() => iniciarEdicion(p)}>Editar</button>
                    <button style={{ ...btnLink, color: 'red' }} onClick={() => eliminar(p.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Formulario */}
          <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 16 }}>
            <h4 style={{ margin: '0 0 12px' }}>{editando ? 'Editar Plantilla' : 'Nueva Plantilla'}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={lbl}>RUT</label>
                <input value={form.rut} onChange={e => setForm(f => ({ ...f, rut: e.target.value }))}
                  placeholder="ej: 76123456-7" style={inp} />
              </div>
              <div>
                <label style={lbl}>Nombre (opcional)</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="ej: COPEC S.A." style={inp} />
              </div>
              <div>
                <label style={lbl}>Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={inp}>
                  <option value="PROVEEDOR">Proveedor</option>
                  <option value="CLIENTE">Cliente</option>
                </select>
              </div>
              <div>
                <label style={lbl}>
                  {form.tipo === 'PROVEEDOR' ? 'Cuenta Gasto/Costo (Debe)' : 'Cuenta Clientes (Debe)'}
                </label>
                <select value={form.id_cuenta_debe} onChange={e => setForm(f => ({ ...f, id_cuenta_debe: e.target.value }))} style={inp}>
                  <option value="">— seleccionar —</option>
                  {cuentasDetalle.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>
                  {form.tipo === 'PROVEEDOR' ? 'Cuenta Proveedores (Haber)' : 'Cuenta Ventas/Ingreso (Haber)'}
                </label>
                <select value={form.id_cuenta_haber} onChange={e => setForm(f => ({ ...f, id_cuenta_haber: e.target.value }))} style={inp}>
                  <option value="">— seleccionar —</option>
                  {cuentasDetalle.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn btn-primary btn-sm" onClick={guardar}
                  disabled={!form.rut || !form.id_cuenta_debe || !form.id_cuenta_haber || guardando}>
                  {guardando ? 'Guardando...' : editando ? 'Actualizar' : 'Guardar'}
                </button>
                {editando && <button className="btn btn-outline btn-sm" onClick={cancelar}>Cancelar</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB GENERAR ── */}
      {tab === 'generar' && (
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
            <select value={año} onChange={e => setAño(e.target.value)} style={sel}>
              {AÑOS.map(a => <option key={a}>{a}</option>)}
            </select>
            <select value={mes} onChange={e => setMes(e.target.value)} style={sel}>
              {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            <select value={operacion} onChange={e => setOp(e.target.value)} style={sel}>
              <option value="COMPRA">Compras</option>
              <option value="VENTA">Ventas</option>
            </select>
            <input type="date" value={fechaAsiento} onChange={e => setFechaAsiento(e.target.value)}
              style={sel} title="Fecha del asiento contable" />
            <button className="btn btn-primary btn-sm" onClick={generar}
              disabled={generando || !fechaAsiento || rutsConPlantilla.length === 0}>
              {generando ? 'Generando...' : '⚡ Generar Asiento'}
            </button>
          </div>

          {resultado && (
            <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <b style={{ color: '#2e7d32' }}>✓ Asiento {resultado.numero} creado como BORRADOR</b>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>
                {resultado.lineas} líneas · DEBE = HABER = {fmt(resultado.total_debe)}
              </p>
              {resultado.ruts_sin_plantilla?.length > 0 && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#e65100' }}>
                  ⚠ {resultado.ruts_sin_plantilla.length} RUT(s) sin plantilla fueron omitidos
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Con plantilla */}
            <div>
              <h4 style={{ margin: '0 0 8px', color: '#2e7d32' }}>✓ Con plantilla ({rutsConPlantilla.length})</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ background: '#f5f5f5' }}>
                  <th style={th}>RUT</th><th style={th}>Nombre</th><th style={{ ...th, textAlign: 'right' }}>Total</th>
                </tr></thead>
                <tbody>
                  {rutsConPlantilla.map(r => (
                    <tr key={r.rut} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={td}><code style={{ fontSize: 11 }}>{r.rut}</code></td>
                      <td style={td}>{r.razon_social || '—'}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(r.total)}</td>
                    </tr>
                  ))}
                  {rutsConPlantilla.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: 12, color: '#888' }}>Ninguno</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Sin plantilla */}
            <div>
              <h4 style={{ margin: '0 0 8px', color: '#e65100' }}>⚠ Sin plantilla ({rutsSinPlantilla.length})</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ background: '#fff3e0' }}>
                  <th style={th}>RUT</th><th style={th}>Nombre</th><th style={{ ...th, textAlign: 'right' }}>Total</th><th style={th}></th>
                </tr></thead>
                <tbody>
                  {rutsSinPlantilla.map(r => (
                    <tr key={r.rut} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={td}><code style={{ fontSize: 11 }}>{r.rut}</code></td>
                      <td style={td}>{r.razon_social || '—'}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(r.total)}</td>
                      <td style={td}>
                        <button style={btnLink} onClick={() => {
                          setTab('plantillas')
                          setForm({ rut: r.rut, nombre: r.razon_social || '', tipo: operacion === 'COMPRA' ? 'PROVEEDOR' : 'CLIENTE', id_cuenta_debe: '', id_cuenta_haber: '' })
                        }}>+ Crear</button>
                      </td>
                    </tr>
                  ))}
                  {rutsSinPlantilla.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 12, color: '#888' }}>Todos configurados ✓</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const th = { textAlign: 'left', padding: '6px 8px', fontWeight: 600, fontSize: 12, borderBottom: '1px solid #e0e0e0' }
const td = { padding: '5px 8px', verticalAlign: 'middle' }
const lbl = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 3, color: '#555' }
const inp = { width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }
const sel = { padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }
const btnLink = { background: 'none', border: 'none', cursor: 'pointer', color: '#1a73e8', fontSize: 12, padding: '0 4px' }
