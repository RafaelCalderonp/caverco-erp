import { useEffect, useState, useCallback } from 'react'
import { useEmpresa } from '../context/EmpresaContext'
import { planCuentasApi } from '../services/api'

const TIPO_LABEL = {
  ACTIVO:    'Activo',
  PASIVO:    'Pasivo',
  PATRIMONIO:'Patrimonio',
  INGRESO:   'Ingresos',
  EGRESO:    'Costos y Gastos',
  ORDEN:     'Cuentas de Orden',
}

const TIPO_ORDER = ['ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'EGRESO', 'ORDEN']

const formVacio = { codigo: '', nombre: '', tipo: 'ACTIVO', nivel: 'D', nota: '' }

function nivelIndent(codigo) {
  return (codigo.match(/\./g) || []).length
}

export default function PlanCuentas() {
  const { empresaActual } = useEmpresa()
  const [cuentas, setCuentas]     = useState([])
  const [cargando, setCargando]   = useState(true)
  const [error, setError]         = useState(null)
  const [form, setForm]           = useState(formVacio)
  const [editando, setEditando]   = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk]               = useState(null)

  const cargar = useCallback(() => {
    if (!empresaActual) return
    setCargando(true)
    planCuentasApi.list(empresaActual.id, true)
      .then(r => setCuentas(r.data))
      .catch(() => setError('No se pudo cargar el plan de cuentas.'))
      .finally(() => setCargando(false))
  }, [empresaActual])

  useEffect(() => { cargar() }, [cargar])

  function iniciarEdicion(c) {
    setEditando(c.id)
    setForm({ codigo: c.codigo, nombre: c.nombre, tipo: c.tipo, nivel: c.nivel, nota: c.nota || '' })
    setOk(null); setError(null)
  }

  function cancelar() { setEditando(null); setForm(formVacio); setError(null) }

  async function guardar() {
    setGuardando(true); setError(null); setOk(null)
    try {
      if (editando) {
        await planCuentasApi.actualizar(empresaActual.id, editando, form)
      } else {
        await planCuentasApi.crear(empresaActual.id, form)
      }
      setOk('Cuenta guardada')
      setEditando(null); setForm(formVacio)
      cargar()
    } catch (e) {
      setError(e.response?.data?.detail || 'Error guardando la cuenta')
    } finally { setGuardando(false) }
  }

  async function toggleActiva(c) {
    try {
      await planCuentasApi.activar(empresaActual.id, c.id, !c.activa)
      cargar()
    } catch { setError('No se pudo cambiar el estado de la cuenta') }
  }

  async function eliminar(c) {
    if (!confirm(`¿Eliminar la cuenta ${c.codigo} — ${c.nombre}?`)) return
    try {
      await planCuentasApi.eliminar(empresaActual.id, c.id)
      cargar()
    } catch (e) {
      alert(e.response?.data?.detail || 'No se pudo eliminar la cuenta')
    }
  }

  if (!empresaActual) return <p>Selecciona una empresa.</p>
  if (cargando) return <p>Cargando...</p>

  const porTipo = {}
  for (const tipo of TIPO_ORDER) porTipo[tipo] = []
  for (const c of cuentas) {
    if (porTipo[c.tipo]) porTipo[c.tipo].push(c)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
      <div>
        <h3 style={{ marginBottom: 20 }}>Plan de Cuentas — {empresaActual.razon_social}</h3>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {ok    && <p style={{ color: 'green' }}>{ok}</p>}
        {TIPO_ORDER.map(tipo => {
          const lista = porTipo[tipo]
          if (!lista.length) return null
          return (
            <div key={tipo} style={{ marginBottom: 32 }}>
              <h4 style={{ margin: '0 0 8px', color: 'var(--primary, #1a73e8)', borderBottom: '2px solid var(--primary, #1a73e8)', paddingBottom: 4 }}>
                {TIPO_LABEL[tipo] || tipo}
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--gray-100, #f5f5f5)' }}>
                    <th style={thStyle}>Código</th>
                    <th style={thStyle}>Nombre</th>
                    <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>Tipo</th>
                    <th style={thStyle}>Nota</th>
                    <th style={{ ...thStyle, textAlign: 'center', width: 70 }}>Origen</th>
                    <th style={{ ...thStyle, width: 130 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map(c => {
                    const indent = nivelIndent(c.codigo)
                    const esAgrupadora = c.nivel === 'A'
                    return (
                      <tr key={c.id} style={{ background: esAgrupadora ? 'var(--gray-50, #fafafa)' : 'white', opacity: c.activa ? 1 : 0.5 }}>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', paddingLeft: 8 + indent * 16 }}>
                          {c.codigo}
                        </td>
                        <td style={{ ...tdStyle, paddingLeft: 8 + indent * 16, fontWeight: esAgrupadora ? 600 : 400 }}>
                          {c.nombre}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', color: esAgrupadora ? 'var(--gray-500, #9e9e9e)' : 'inherit' }}>
                          {esAgrupadora ? 'Grupo' : 'Detalle'}
                        </td>
                        <td style={{ ...tdStyle, color: 'var(--gray-600, #757575)', fontSize: 12 }}>
                          {c.nota || ''}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10,
                            background: c.origen === 'PROPIA' ? '#e3f2fd' : '#f0f0f0',
                            color: c.origen === 'PROPIA' ? '#1565c0' : '#666' }}>
                            {c.origen === 'PROPIA' ? 'Propia' : 'Base'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <button style={btnLink} onClick={() => toggleActiva(c)}>
                            {c.activa ? 'Desactivar' : 'Activar'}
                          </button>
                          {c.origen === 'PROPIA' && <>
                            <button style={btnLink} onClick={() => iniciarEdicion(c)}>Editar</button>
                            <button style={{ ...btnLink, color: 'red' }} onClick={() => eliminar(c)}>Eliminar</button>
                          </>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>

      <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, position: 'sticky', top: 20 }}>
        <h4 style={{ margin: '0 0 12px' }}>{editando ? 'Editar Cuenta Propia' : 'Nueva Cuenta Propia'}</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={lbl}>Código</label>
            <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
              placeholder="ej: 1.1.1.15" style={inp} />
          </div>
          <div>
            <label style={lbl}>Nombre</label>
            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="ej: Banco Cuenta Vista" style={inp} />
          </div>
          <div>
            <label style={lbl}>Tipo</label>
            <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={inp}>
              {TIPO_ORDER.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Nivel</label>
            <select value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))} style={inp}>
              <option value="D">Detalle</option>
              <option value="A">Agrupadora</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Nota (opcional)</label>
            <input value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))} style={inp} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn btn-primary btn-sm" onClick={guardar}
              disabled={!form.codigo || !form.nombre || guardando}>
              {guardando ? 'Guardando...' : editando ? 'Actualizar' : 'Guardar'}
            </button>
            {editando && <button className="btn btn-outline btn-sm" onClick={cancelar}>Cancelar</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

const thStyle = {
  textAlign: 'left',
  padding: '6px 8px',
  fontWeight: 600,
  fontSize: 12,
  borderBottom: '1px solid var(--gray-200, #e0e0e0)',
}

const tdStyle = {
  padding: '5px 8px',
  borderBottom: '1px solid var(--gray-100, #f5f5f5)',
  verticalAlign: 'top',
}

const lbl = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 3, color: '#555' }
const inp = { width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }
const btnLink = { background: 'none', border: 'none', cursor: 'pointer', color: '#1a73e8', fontSize: 12, padding: '0 4px' }
