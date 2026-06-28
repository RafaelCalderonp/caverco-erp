export function formatearRut(valor) {
  const limpio = valor.replace(/[^0-9kK]/g, '')
  if (limpio.length < 2) return valor
  const cuerpo = limpio.slice(0, -1)
  const verificador = limpio.slice(-1).toUpperCase()
  const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${cuerpoConPuntos}-${verificador}`
}

function digitoVerificador(cuerpo) {
  let suma = 0
  let multiplicador = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1
  }
  const resto = 11 - (suma % 11)
  if (resto === 11) return '0'
  if (resto === 10) return 'K'
  return String(resto)
}

export function validarRut(valor) {
  const limpio = (valor || '').replace(/[^0-9kK]/g, '')
  if (limpio.length < 2) return false
  const cuerpo = limpio.slice(0, -1)
  const verificador = limpio.slice(-1).toUpperCase()
  if (!/^\d+$/.test(cuerpo)) return false
  return digitoVerificador(cuerpo) === verificador
}
