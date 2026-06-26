"""
Caverco ERP — Motor de cálculo de liquidaciones Chile
Soporta datos dinámicos desde Previred (API Gateway) o fallback hardcoded.
"""
from decimal import Decimal, ROUND_HALF_UP
from dataclasses import dataclass, field
from typing import Optional

# Tramos Impuesto Único Mayo 2026 — se actualizan anualmente
# Formato: (desde, hasta_o_None, factor, rebaja)
TRAMOS_IU_2026 = [
    (Decimal("0"),           Decimal("702067"),    Decimal("0"),     Decimal("0")),
    (Decimal("702067.01"),   Decimal("1560150"),   Decimal("0.04"),  Decimal("28082.70")),
    (Decimal("1560150.01"),  Decimal("2600250"),   Decimal("0.08"),  Decimal("90488.70")),
    (Decimal("2600250.01"),  Decimal("3640350"),   Decimal("0.135"), Decimal("233502.45")),
    (Decimal("3640350.01"),  Decimal("4680450"),   Decimal("0.23"),  Decimal("579335.70")),
    (Decimal("4680450.01"),  Decimal("6240600"),   Decimal("0.304"), Decimal("925689.00")),
    (Decimal("6240600.01"),  Decimal("16121550"),  Decimal("0.35"),  Decimal("1212756.60")),
    (Decimal("16121550.01"), None,                 Decimal("0.40"),  Decimal("2018834.10")),
]

def _r(v: Decimal) -> Decimal:
    return v.quantize(Decimal("1"), rounding=ROUND_HALF_UP)

def calcular_impuesto_unico(base: Decimal, tramos: list = None) -> Decimal:
    tramos = tramos or TRAMOS_IU_2026
    for desde, hasta, factor, rebaja in tramos:
        if hasta is None or base <= hasta:
            return _r(max(Decimal("0"), base * factor - rebaja))
    return Decimal("0")

def calcular_gratificacion(sueldo_base: Decimal, tope_gratif: Decimal, dias: int = 30) -> Decimal:
    gratif = min(sueldo_base * Decimal("0.25"), tope_gratif)
    if dias < 30:
        gratif = gratif * Decimal(dias) / Decimal("30")
    return _r(gratif)


def _meses_entre(fecha_inicio, fecha_termino) -> int:
    """Meses completos transcurridos entre dos fechas (redondeo hacia abajo)."""
    meses = (fecha_termino.year - fecha_inicio.year) * 12 + (fecha_termino.month - fecha_inicio.month)
    if fecha_termino.day < fecha_inicio.day:
        meses -= 1
    return max(meses, 0)


def calcular_indemnizacion_anos_servicio(
    sueldo_base: Decimal, fecha_inicio, fecha_termino,
    tope_uf: Decimal = Decimal("90"), valor_uf: Decimal = Decimal("40610.69"),
    max_anos: int = 11,
) -> Decimal:
    """
    IAS (Art. 163 Código del Trabajo): 1 mes de remuneración por cada año de
    servicio y fracción superior a 6 meses, tope 11 años y tope 90 UF por año.
    """
    meses = _meses_entre(fecha_inicio, fecha_termino)
    anos = meses // 12
    if meses % 12 > 6:
        anos += 1
    anos = min(anos, max_anos)
    if anos <= 0:
        return Decimal("0")
    tope_mensual = _r(tope_uf * valor_uf)
    mensualidad = min(sueldo_base, tope_mensual)
    return _r(mensualidad * Decimal(anos))


def calcular_indemnizacion_sustitutiva_aviso_previo(sueldo_base: Decimal) -> Decimal:
    """Art. 162: si el empleador no dio aviso previo de 30 días, debe pagar 1 mes de sueldo."""
    return _r(sueldo_base)


def calcular_vacaciones_proporcionales(
    sueldo_base: Decimal, fecha_inicio, fecha_ultimo_feriado, fecha_termino,
    dias_feriado_anual: int = 15,
) -> Decimal:
    """
    Art. 73: feriado proporcional al tiempo trabajado desde el último feriado
    legal (o desde el inicio del contrato si nunca hizo uso de feriado).
    """
    dias_periodo = (fecha_termino - fecha_ultimo_feriado).days
    if dias_periodo <= 0:
        return Decimal("0")
    dias_proporcionales = Decimal(dias_periodo) * Decimal(dias_feriado_anual) / Decimal("365")
    sueldo_diario = _r(sueldo_base / Decimal("30"))
    return _r(sueldo_diario * dias_proporcionales)


def calcular_semana_corrida(sueldo_diario: Decimal, dias_domingos_y_festivos: int) -> Decimal:
    """
    Art. 45: trabajadores remunerados por día tienen derecho a que el pago
    de los días domingo y festivos se calcule sobre el promedio de lo
    devengado en los días trabajados de la semana.
    """
    return _r(sueldo_diario * Decimal(dias_domingos_y_festivos))


@dataclass
class ResultadoFiniquito:
    indemnizacion_anos_servicio:       Decimal
    indemnizacion_sustitutiva_aviso:   Decimal
    vacaciones_proporcionales:         Decimal
    total_finiquito:                   Decimal


def calcular_finiquito(
    sueldo_base: Decimal, fecha_inicio, fecha_termino, fecha_ultimo_feriado,
    valor_uf: Decimal = Decimal("40610.69"),
    procede_indemnizacion_anos_servicio: bool = False,
    procede_aviso_previo: bool = False,
    dias_feriado_anual: int = 15,
) -> ResultadoFiniquito:
    ias = (
        calcular_indemnizacion_anos_servicio(sueldo_base, fecha_inicio, fecha_termino, valor_uf=valor_uf)
        if procede_indemnizacion_anos_servicio else Decimal("0")
    )
    aviso = (
        calcular_indemnizacion_sustitutiva_aviso_previo(sueldo_base)
        if procede_aviso_previo else Decimal("0")
    )
    vacaciones = calcular_vacaciones_proporcionales(
        sueldo_base, fecha_inicio, fecha_ultimo_feriado, fecha_termino, dias_feriado_anual,
    )
    total = _r(ias + aviso + vacaciones)
    return ResultadoFiniquito(
        indemnizacion_anos_servicio=ias,
        indemnizacion_sustitutiva_aviso=aviso,
        vacaciones_proporcionales=vacaciones,
        total_finiquito=total,
    )


@dataclass
class IndicadoresPrevired:
    """Datos previsionales del período — vienen de API Gateway o fallback."""
    periodo:        str
    uf:             Decimal = Decimal("40610.69")
    utm:            Decimal = Decimal("70588")
    sis:            Decimal = Decimal("0.0249")
    sueldo_minimo:  Decimal = Decimal("539000")
    tope_gratif:    Decimal = Decimal("213354")
    renta_tope_afp: Decimal = Decimal("3581157")
    renta_tope_afc: Decimal = Decimal("5379693")
    tasa_afp:       Decimal = Decimal("0.1144")   # tasa AFP del trabajador específico
    tasa_salud:           Decimal = Decimal("0.07")
    afc_empleador_tasa:   Decimal = field(default=Decimal("0.030"))
    afc_trabajador_tasa:  Decimal = field(default=Decimal("0"))
    aporte_empleador_afp: Decimal = field(default=Decimal("0.001"))   # 0.1% aporte patronal AFP
    seguro_social:        Decimal = field(default=Decimal("0.009"))   # 0.9% expectativa de vida
    tramos_iu:            list    = field(default_factory=lambda: TRAMOS_IU_2026)  # tramos vigentes del período

    @classmethod
    def desde_api(cls, ind: dict, nombre_afp: str, tipo_contrato: str, periodo: str) -> "IndicadoresPrevired":
        afp_data = ind.get("afp", {}).get(nombre_afp, {})
        tasa_afp = afp_data.get("tasa_trabajador", Decimal("0.1144")) if afp_data else Decimal("0.1144")
        afc = ind.get("afc", {})
        tipo_key = tipo_contrato.lower().replace(" ", "_")
        if "indefinido" in tipo_key:
            afc_emp  = afc.get("indefinido_empleador",  Decimal("0.024"))
            afc_trab = afc.get("indefinido_trabajador", Decimal("0.006"))
        else:
            afc_emp  = afc.get("plazo_fijo_empleador",  Decimal("0.030"))
            afc_trab = afc.get("plazo_fijo_trabajador", Decimal("0"))
        return cls(
            periodo=periodo,
            uf=ind.get("uf", Decimal("40610.69")),
            utm=ind.get("utm", Decimal("70588")),
            sis=ind.get("sis", Decimal("0.0249")),
            sueldo_minimo=ind.get("sueldo_minimo", Decimal("539000")),
            tope_gratif=ind.get("tope_gratif", Decimal("213354")),
            renta_tope_afp=ind.get("renta_tope_afp", Decimal("3581157")),
            renta_tope_afc=ind.get("renta_tope_afc", Decimal("5379693")),
            tasa_afp=tasa_afp,
            tasa_salud=Decimal("0.07"),
            afc_empleador_tasa=afc_emp,
            afc_trabajador_tasa=afc_trab,
            aporte_empleador_afp=ind.get("aporte_empleador_afp", Decimal("0.001")),
            seguro_social=ind.get("seguro_social", Decimal("0.009")),
        )


@dataclass
class EntradaLiquidacion:
    nombre_empleado:  str
    rut:              str
    tipo_contrato:    str        # INDEFINIDO / PLAZO_FIJO / POR_OBRA
    afp_nombre:       str
    es_fonasa:        bool    = True
    valor_isapre_uf:  Decimal = Decimal("0")
    dias_trabajados:  int     = 30
    # Haberes imponibles
    sueldo_base:      Decimal = Decimal("0")
    horas_extra_50:   Decimal = Decimal("0")   # monto CLP ya calculado
    horas_extra_100:  Decimal = Decimal("0")
    aguinaldo:        Decimal = Decimal("0")
    # Haberes no imponibles
    colacion:         Decimal = Decimal("0")
    movilizacion:     Decimal = Decimal("0")
    viaticos:         Decimal = Decimal("0")
    asig_familiar:    Decimal = Decimal("0")
    otros_haberes:    Decimal = Decimal("0")
    # Descuentos voluntarios
    anticipo:         Decimal = Decimal("0")
    prestamo:         Decimal = Decimal("0")
    otros_descuentos: Decimal = Decimal("0")


@dataclass
class ResultadoLiquidacion:
    # Haberes
    sueldo_base:          Decimal
    gratificacion:        Decimal
    horas_extra_50:       Decimal
    horas_extra_100:      Decimal
    aguinaldo:            Decimal
    total_imponible:      Decimal
    colacion:             Decimal
    movilizacion:         Decimal
    viaticos:             Decimal
    asig_familiar:        Decimal
    otros_haberes:        Decimal
    total_haberes:        Decimal
    # Descuentos legales
    descuento_afp:        Decimal
    descuento_salud:      Decimal
    adicional_salud:      Decimal
    afc_trabajador: Decimal
    base_tributaria:      Decimal
    impuesto_unico:       Decimal
    total_desc_legales:   Decimal
    # Voluntarios
    anticipo:             Decimal
    prestamo:             Decimal
    otros_descuentos:     Decimal
    total_otros_desc:     Decimal
    # Resultado
    liquido_a_pagar:      Decimal
    # Costos empleador (aportes patronales — no son descuento al trabajador)
    afc_empleador:             Decimal   # AFC cargo empleador
    sis_empleador:             Decimal   # SIS (Seguro Invalidez y Sobrevivencia)
    aporte_empleador_afp:      Decimal   # 0.1% aporte adicional AFP
    seguro_social_empleador:   Decimal   # 0.9% seguro social / expectativa de vida
    total_costo_empleador:     Decimal   # suma total aportes patronales
    # Meta
    tasa_afp_usada:       Decimal
    uf_usada:             Decimal
    utm_usada:            Decimal
    periodo:              str


def calcular_liquidacion(
    e: EntradaLiquidacion,
    ind: IndicadoresPrevired,
) -> ResultadoLiquidacion:
    # 1. Prorrateo por días
    factor = Decimal(e.dias_trabajados) / Decimal("30")
    sueldo = _r(e.sueldo_base * factor)

    # 2. Gratificación legal (25% sueldo base, tope UTM × 4.75)
    gratif = calcular_gratificacion(e.sueldo_base, ind.tope_gratif, e.dias_trabajados)

    # 3. Total imponible (tope AFP = renta_tope_afp)
    total_imp_bruto = _r(sueldo + gratif + e.horas_extra_50 + e.horas_extra_100 + e.aguinaldo)
    total_imp = _r(min(total_imp_bruto, ind.renta_tope_afp))

    # 4. Total haberes
    total_hab = _r(total_imp + e.colacion + e.movilizacion + e.viaticos + e.asig_familiar + e.otros_haberes)

    # 5. Descuento AFP
    desc_afp = _r(total_imp * ind.tasa_afp)

    # 6. Descuento Salud
    desc_salud_base = _r(total_imp * ind.tasa_salud)
    if e.es_fonasa:
        desc_salud  = desc_salud_base
        adic_salud  = Decimal("0")
    else:
        clp_isapre  = _r(e.valor_isapre_uf * ind.uf)
        desc_salud  = desc_salud_base
        adic_salud  = _r(max(Decimal("0"), clp_isapre - desc_salud_base))

    # 7. AFC trabajador
    seg_ces = _r(total_imp * ind.afc_trabajador_tasa)

    # 8. Base tributaria
    base_trib = _r(total_imp - desc_afp - desc_salud - adic_salud - seg_ces)

    # 9. Impuesto Único
    imp_unico = calcular_impuesto_unico(base_trib, ind.tramos_iu)

    # 10. Totales
    total_leg   = _r(desc_afp + desc_salud + adic_salud + imp_unico + seg_ces)
    total_otros = _r(e.anticipo + e.prestamo + e.otros_descuentos)
    liquido     = _r(total_hab - total_leg - total_otros)

    # Costos patronales
    afc_emp    = _r(total_imp * ind.afc_empleador_tasa)
    sis_emp    = _r(total_imp * ind.sis)
    aporte_afp = _r(total_imp * ind.aporte_empleador_afp)
    seg_soc    = _r(total_imp * ind.seguro_social)
    total_patronal = _r(afc_emp + sis_emp + aporte_afp + seg_soc)

    return ResultadoLiquidacion(
        sueldo_base=sueldo, gratificacion=gratif,
        horas_extra_50=e.horas_extra_50, horas_extra_100=e.horas_extra_100,
        aguinaldo=e.aguinaldo, total_imponible=total_imp,
        colacion=e.colacion, movilizacion=e.movilizacion, viaticos=e.viaticos,
        asig_familiar=e.asig_familiar, otros_haberes=e.otros_haberes,
        total_haberes=total_hab,
        descuento_afp=desc_afp, descuento_salud=desc_salud,
        adicional_salud=adic_salud, afc_trabajador=seg_ces,
        base_tributaria=base_trib, impuesto_unico=imp_unico,
        total_desc_legales=total_leg,
        anticipo=e.anticipo, prestamo=e.prestamo,
        otros_descuentos=e.otros_descuentos, total_otros_desc=total_otros,
        liquido_a_pagar=liquido,
        afc_empleador=afc_emp,
        sis_empleador=sis_emp,
        aporte_empleador_afp=aporte_afp,
        seguro_social_empleador=seg_soc,
        total_costo_empleador=total_patronal,
        tasa_afp_usada=ind.tasa_afp,
        uf_usada=ind.uf, utm_usada=ind.utm,
        periodo=ind.periodo,
    )
