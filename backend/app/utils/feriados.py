"""Feriados legales chilenos y cálculo de días hábiles/calendario."""
from datetime import date, timedelta
from decimal import Decimal


def _easter(year: int) -> date:
    """Algoritmo de Butcher para calcular el Domingo de Pascua."""
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day)


def _lunes_cercano(d: date) -> date:
    """Traslada un feriado al lunes más cercano si cae sábado o domingo."""
    dow = d.weekday()  # 0=lun, 5=sab, 6=dom
    if dow == 5:
        return d + timedelta(days=2)
    if dow == 6:
        return d + timedelta(days=1)
    return d


def feriados_del_anio(year: int) -> set[date]:
    easter = _easter(year)
    viernes_santo = easter - timedelta(days=2)
    sabado_santo  = easter - timedelta(days=1)

    fijos = {
        date(year, 1, 1),   # Año Nuevo
        viernes_santo,
        sabado_santo,
        date(year, 5, 1),   # Día del Trabajo
        date(year, 5, 21),  # Glorias Navales
        date(year, 6, 20),  # Día de los Pueblos Indígenas (aprox.)
        date(year, 7, 16),  # Virgen del Carmen
        date(year, 8, 15),  # Asunción de la Virgen
        date(year, 9, 18),  # Independencia Nacional
        date(year, 9, 19),  # Glorias del Ejército
        date(year, 10, 31), # Iglesias Evangélicas
        date(year, 11, 1),  # Todos los Santos
        date(year, 12, 8),  # Inmaculada Concepción
        date(year, 12, 25), # Navidad
        _lunes_cercano(date(year, 6, 29)),  # San Pedro y San Pablo
        _lunes_cercano(date(year, 10, 12)), # Encuentro Dos Mundos
    }
    return fijos


_cache: dict[int, set[date]] = {}


def es_habil(d: date) -> bool:
    year = d.year
    if year not in _cache:
        _cache[year] = feriados_del_anio(year)
    return d.weekday() < 5 and d not in _cache[year]


def calcular_dias_calendario(fecha_inicio: date, dias_habiles: Decimal) -> tuple[Decimal, Decimal]:
    """
    Desde fecha_inicio (día siguiente al despido), cuenta días hábiles
    hasta completar dias_habiles. Retorna (dias_calendario, dias_inhabiles).
    """
    if dias_habiles <= 0:
        return Decimal("0"), Decimal("0")

    cur = fecha_inicio
    habiles_contados = Decimal("0")
    dias_calendario = Decimal("0")

    while habiles_contados < dias_habiles:
        restante = dias_habiles - habiles_contados
        if es_habil(cur):
            fraccion = min(Decimal("1"), restante)
            habiles_contados += fraccion
            dias_calendario += fraccion
        else:
            dias_calendario += Decimal("1")

        if habiles_contados < dias_habiles:
            cur += timedelta(days=1)

    dias_inhabiles = dias_calendario - dias_habiles
    return dias_calendario, dias_inhabiles
