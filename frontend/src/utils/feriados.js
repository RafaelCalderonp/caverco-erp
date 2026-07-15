// Feriados legales de Chile — Art. 169 CT y leyes especiales
// Cubre 2024-2028

function easterSunday(year) {
  // Algoritmo de Butcher
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

// Lunes más cercano (para feriados que se trasladan)
function lunesCercano(date) {
  const day = date.getDay() // 0=Dom, 6=Sab
  if (day === 0) { date.setDate(date.getDate() + 1) }
  else if (day === 6) { date.setDate(date.getDate() + 2) }
  return date
}

function ymd(y, m, d) { return new Date(y, m - 1, d) }
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d }
function fmt(date) { return date.toISOString().slice(0, 10) }

function feriadosDelAnio(year) {
  const easter = easterSunday(year)
  const viernesSanto = addDays(easter, -2)
  const sabadoSanto  = addDays(easter, -1)

  const fijos = [
    ymd(year, 1, 1),   // Año Nuevo
    viernesSanto,
    sabadoSanto,
    ymd(year, 5, 1),   // Día del Trabajo
    ymd(year, 5, 21),  // Glorias Navales
    ymd(year, 6, 20),  // Día de los Pueblos Indígenas (solsticio, aprox 20 jun)
    ymd(year, 7, 16),  // Virgen del Carmen
    ymd(year, 8, 15),  // Asunción de la Virgen
    ymd(year, 9, 18),  // Independencia Nacional
    ymd(year, 9, 19),  // Glorias del Ejército
    ymd(year, 10, 31), // Iglesias Evangélicas y Protestantes
    ymd(year, 11, 1),  // Todos los Santos
    ymd(year, 12, 8),  // Inmaculada Concepción
    ymd(year, 12, 25), // Navidad
  ]

  // Jun 29 San Pedro y San Pablo — se traslada al lunes más cercano
  fijos.push(lunesCercano(ymd(year, 6, 29)))
  // Oct 12 Encuentro Dos Mundos — se traslada al lunes más cercano
  fijos.push(lunesCercano(ymd(year, 10, 12)))

  return new Set(fijos.map(fmt))
}

// Cache por año
const _cache = {}
function getFeriados(year) {
  if (!_cache[year]) _cache[year] = feriadosDelAnio(year)
  return _cache[year]
}

export function esFeriado(date) {
  return getFeriados(date.getFullYear()).has(fmt(date))
}

export function esHabil(date) {
  const dow = date.getDay()
  return dow !== 0 && dow !== 6 && !esFeriado(date)
}

/**
 * Dado una fechaInicio (día posterior al despido) y diasHabilesDecimal,
 * devuelve { diasCalendario, diasInhabiles }.
 *
 * Avanza por el calendario contando solo días hábiles (lun-vie, no feriado)
 * hasta completar diasHabilesDecimal. Retorna el total de días calendario
 * recorridos (incluyendo inhábiles).
 */
export function calcularDiasCalendario(fechaInicioStr, diasHabilesDecimal) {
  if (diasHabilesDecimal <= 0) return { diasCalendario: 0, diasInhabiles: 0 }

  const inicio = new Date(fechaInicioStr + 'T00:00:00')
  let cur = new Date(inicio)
  let habilesContados = 0
  let diasCalendario = 0

  while (habilesContados < diasHabilesDecimal) {
    const restante = diasHabilesDecimal - habilesContados
    if (esHabil(cur)) {
      const fraccion = Math.min(1, restante)
      habilesContados += fraccion
      diasCalendario += fraccion  // fracción del último día
      if (fraccion < 1) break     // último día parcial
    } else {
      diasCalendario += 1         // día inhábil completo
    }
    if (habilesContados < diasHabilesDecimal) cur.setDate(cur.getDate() + 1)
  }

  // Redondear para evitar floating-point noise
  diasCalendario = Math.round(diasCalendario * 100) / 100
  const diasInhabiles = Math.round((diasCalendario - diasHabilesDecimal) * 100) / 100

  return { diasCalendario, diasInhabiles }
}
