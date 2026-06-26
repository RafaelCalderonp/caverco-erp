"""
Tests unitarios puros (sin BD) para el motor de cálculo de liquidaciones
y la validación de RUT del exportador Previred.
"""
from datetime import date
from decimal import Decimal

from app.services.liquidaciones import (
    EntradaLiquidacion, IndicadoresPrevired, calcular_liquidacion,
    calcular_impuesto_unico, calcular_gratificacion, _r,
    calcular_indemnizacion_anos_servicio, calcular_indemnizacion_sustitutiva_aviso_previo,
    calcular_vacaciones_proporcionales, calcular_semana_corrida, calcular_finiquito,
)
from app.services.previred_export import _dv_esperado, _split_rut


def _entrada(**overrides):
    base = dict(
        nombre_empleado="Juan Perez", rut="12345678-5",
        tipo_contrato="INDEFINIDO", afp_nombre="Cuprum",
        sueldo_base=Decimal("1000000"),
    )
    base.update(overrides)
    return EntradaLiquidacion(**base)


def _indicadores(**overrides):
    base = dict(periodo="2026-06")
    base.update(overrides)
    return IndicadoresPrevired(**base)


def test_calculo_basico_fonasa():
    res = calcular_liquidacion(_entrada(), _indicadores())
    assert res.sueldo_base == Decimal("1000000")
    assert res.descuento_afp == _r(res.total_imponible * Decimal("0.1144"))
    assert res.adicional_salud == Decimal("0")
    assert res.liquido_a_pagar > 0
    assert res.liquido_a_pagar < res.total_haberes


def test_prorrateo_dias_trabajados():
    completo = calcular_liquidacion(_entrada(), _indicadores())
    parcial = calcular_liquidacion(_entrada(dias_trabajados=15), _indicadores())
    assert parcial.sueldo_base == Decimal(completo.sueldo_base) / 2
    assert parcial.gratificacion < completo.gratificacion


def test_isapre_adicional_cuando_supera_7_porciento():
    res = calcular_liquidacion(
        _entrada(es_fonasa=False, valor_isapre_uf=Decimal("10")),
        _indicadores(),
    )
    assert res.adicional_salud >= Decimal("0")


def test_tope_imponible_afp():
    ind = _indicadores(renta_tope_afp=Decimal("500000"))
    res = calcular_liquidacion(_entrada(sueldo_base=Decimal("2000000")), ind)
    assert res.total_imponible == Decimal("500000")


def test_impuesto_unico_tramo_exento():
    assert calcular_impuesto_unico(Decimal("500000")) == Decimal("0")


def test_impuesto_unico_tramo_con_recargo():
    monto = calcular_impuesto_unico(Decimal("1000000"))
    assert monto > Decimal("0")


def test_gratificacion_respeta_tope():
    g = calcular_gratificacion(Decimal("10000000"), tope_gratif=Decimal("213354"))
    assert g == Decimal("213354")


def test_rut_split_y_validacion_dv():
    num, dv = _split_rut("12345678-5")
    assert num == "12345678"
    assert dv == "5"
    assert _dv_esperado("12345678") == "5"


def test_rut_dv_invalido_detectado():
    num, dv = _split_rut("12345678-9")
    assert _dv_esperado(num) != dv


def test_ias_redondea_anos_por_fraccion_superior_a_6_meses():
    sueldo = Decimal("1000000")
    # 2020-01-15 a 2026-08-01: 6 años y 6 meses exactos (fracción no > 6 meses) -> 6 años
    seis_anos = calcular_indemnizacion_anos_servicio(
        sueldo, date(2020, 1, 15), date(2026, 8, 1), valor_uf=Decimal("40000"),
    )
    assert seis_anos == sueldo * Decimal("6")
    # un día más de fracción (8 meses) -> redondea a 7 años
    siete_anos = calcular_indemnizacion_anos_servicio(
        sueldo, date(2020, 1, 15), date(2026, 10, 1), valor_uf=Decimal("40000"),
    )
    assert siete_anos == sueldo * Decimal("7")


def test_ias_sin_anos_completos_es_cero():
    ias = calcular_indemnizacion_anos_servicio(Decimal("1000000"), date(2026, 1, 1), date(2026, 5, 1))
    assert ias == Decimal("0")


def test_ias_respeta_tope_90_uf():
    sueldo = Decimal("10000000")  # muy por sobre el tope mensual de 90 UF
    valor_uf = Decimal("40000")
    ias = calcular_indemnizacion_anos_servicio(sueldo, date(2015, 1, 1), date(2026, 1, 1), valor_uf=valor_uf)
    tope_mensual = Decimal("90") * valor_uf
    assert ias == _r(tope_mensual) * Decimal("11")  # tope 11 años


def test_indemnizacion_sustitutiva_aviso_previo_es_un_mes():
    assert calcular_indemnizacion_sustitutiva_aviso_previo(Decimal("800000")) == Decimal("800000")


def test_vacaciones_proporcionales_crecen_con_el_tiempo():
    sueldo = Decimal("900000")
    corto = calcular_vacaciones_proporcionales(sueldo, date(2026, 1, 1), date(2026, 1, 1), date(2026, 2, 1))
    largo = calcular_vacaciones_proporcionales(sueldo, date(2026, 1, 1), date(2026, 1, 1), date(2026, 7, 1))
    assert largo > corto > Decimal("0")


def test_semana_corrida_basico():
    assert calcular_semana_corrida(Decimal("20000"), 2) == Decimal("40000")


def test_finiquito_suma_componentes_activados():
    res = calcular_finiquito(
        sueldo_base=Decimal("1000000"),
        fecha_inicio=date(2020, 1, 1),
        fecha_termino=date(2026, 6, 1),
        fecha_ultimo_feriado=date(2025, 6, 1),
        procede_indemnizacion_anos_servicio=True,
        procede_aviso_previo=True,
    )
    assert res.indemnizacion_anos_servicio > Decimal("0")
    assert res.indemnizacion_sustitutiva_aviso == Decimal("1000000")
    assert res.vacaciones_proporcionales > Decimal("0")
    assert res.total_finiquito == _r(
        res.indemnizacion_anos_servicio + res.indemnizacion_sustitutiva_aviso + res.vacaciones_proporcionales
    )


def test_finiquito_sin_componentes_opcionales():
    res = calcular_finiquito(
        sueldo_base=Decimal("1000000"),
        fecha_inicio=date(2026, 1, 1),
        fecha_termino=date(2026, 6, 1),
        fecha_ultimo_feriado=date(2026, 1, 1),
    )
    assert res.indemnizacion_anos_servicio == Decimal("0")
    assert res.indemnizacion_sustitutiva_aviso == Decimal("0")
    assert res.vacaciones_proporcionales > Decimal("0")
