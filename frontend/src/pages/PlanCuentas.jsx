import { useEffect, useState } from 'react'
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

function nivelIndent(codigo) {
  const dots = (codigo.match(/\./g) || []).length
  return dots
}

export default function PlanCuentas() {
  const [cuentas, setCuentas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    planCuentasApi.list()
      .then(r => setCuentas(r.data))
      .catch(() => setError('No se pudo cargar el plan de cuentas.'))
      .finally(() => setCargando(false))
  }, [])

  if (cargando) return <p>Cargando...</p>
  if (error)    return <p style={{ color: 'red' }}>{error}</p>

  const porTipo = {}
  for (const tipo of TIPO_ORDER) porTipo[tipo] = []
  for (const c of cuentas) {
    if (porTipo[c.tipo]) porTipo[c.tipo].push(c)
  }

  return (
    <div>
      <h3 style={{ marginBottom: 20 }}>Plan de Cuentas</h3>
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
                </tr>
              </thead>
              <tbody>
                {lista.map(c => {
                  const indent = nivelIndent(c.codigo)
                  const esAgrupadora = c.nivel === 'A'
                  return (
                    <tr key={c.id} style={{ background: esAgrupadora ? 'var(--gray-50, #fafafa)' : 'white' }}>
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
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
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
