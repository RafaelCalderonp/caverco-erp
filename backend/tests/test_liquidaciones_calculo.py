"""
Tests unitarios puros (sin BD) para el motor de cálculo de liquidaciones
y la validación de RUT del exportador Previred.
"""
from decimal import Decimal

from app.services.liquidaciones import (
    EntradaLiquidacion, IndicadoresPrevired, calcular_liquidacion,
    calcular_impuesto_unico, calcular_gratificacion, _r,
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
