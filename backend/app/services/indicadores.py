"""
Caverco ERP — Indicadores previsionales versionados.

Fuente de verdad: tablas erp.valores_uf_utm / erp.tramos_impuesto_unico,
versionadas por período (YYYY-MM). Esto permite auditar exactamente qué
UF/UTM/tramos de impuesto se usaron en cada liquidación ya emitida, en vez
de depender de constantes hardcodeadas en el código que cambian cada año.

Si un período no tiene fila en BD, se siembra automáticamente desde
PreviredService (API Gateway o fallback hardcoded) y se persiste, dejando
registro de la fuente (`fuente` = API_GATEWAY / FALLBACK).
"""
import logging
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rrhh import Empleado, ValorUfUtm, TramoImpuestoUnico
from sqlalchemy import delete
from app.services.liquidaciones import IndicadoresPrevired, TRAMOS_IU_2026, calcular_tramos_desde_utm
from app.services.previred import get_previred_service

log = logging.getLogger(__name__)


async def obtener_valor_periodo(db: AsyncSession, periodo: str) -> ValorUfUtm | None:
    result = await db.execute(select(ValorUfUtm).where(ValorUfUtm.periodo == periodo))
    return result.scalar_one_or_none()


async def obtener_tramos_periodo(db: AsyncSession, periodo: str) -> list[TramoImpuestoUnico]:
    result = await db.execute(
        select(TramoImpuestoUnico).where(TramoImpuestoUnico.periodo == periodo).order_by(TramoImpuestoUnico.desde)
    )
    return list(result.scalars().all())


async def asegurar_indicadores(db: AsyncSession, periodo: str) -> None:
    """Si el período no está versionado en BD, lo siembra desde Previred/fallback."""
    if await obtener_valor_periodo(db, periodo) is None:
        year, month = int(periodo[:4]), int(periodo[5:7])
        svc = get_previred_service()
        raw = await svc.obtener_indicadores(year, month)
        fuente = raw.get("_fuente", "FALLBACK")

        db.add(ValorUfUtm(
            periodo=periodo,
            valor_uf=raw["uf"], valor_utm=raw["utm"],
            sueldo_minimo=raw["sueldo_minimo"], tope_gratificacion=raw["tope_gratif"],
            renta_tope_afp=raw["renta_tope_afp"], renta_tope_afc=raw["renta_tope_afc"],
            sis=raw["sis"],
            aporte_empleador_afp=raw.get("aporte_empleador_afp", Decimal("0.001")),
            seguro_social=raw.get("seguro_social", Decimal("0.009")),
            fuente=fuente,
        ))
        await db.flush()
        log.warning("Indicadores %s no existían en BD — sembrados desde %s", periodo, fuente)

    if not await obtener_tramos_periodo(db, periodo):
        val = await obtener_valor_periodo(db, periodo)
        utm = val.valor_utm if val else Decimal("46129")
        tramos_seed = calcular_tramos_desde_utm(utm)
        for desde, hasta, factor, rebaja in tramos_seed:
            db.add(TramoImpuestoUnico(periodo=periodo, desde=desde, hasta=hasta, factor=factor, monto_rebaja=rebaja))
        await db.flush()
        log.warning("Tramos impuesto único %s sembrados desde UTM=%s", periodo, utm)


async def refrescar_indicadores(db: AsyncSession, periodo: str) -> None:
    """Re-fetch desde Gael Cloud y sobreescribe el registro en BD para el período."""
    year, month = int(periodo[:4]), int(periodo[5:7])
    svc = get_previred_service()
    svc.limpiar_cache()
    raw = await svc.obtener_indicadores(year, month)
    fuente = raw.get("_fuente", "FALLBACK")

    existing = await obtener_valor_periodo(db, periodo)
    if existing:
        existing.valor_uf           = raw["uf"]
        existing.valor_utm          = raw["utm"]
        existing.sueldo_minimo      = raw["sueldo_minimo"]
        existing.tope_gratificacion = raw["tope_gratif"]
        existing.renta_tope_afp     = raw["renta_tope_afp"]
        existing.renta_tope_afc     = raw["renta_tope_afc"]
        existing.sis                = raw["sis"]
        existing.aporte_empleador_afp = raw.get("aporte_empleador_afp", Decimal("0.001"))
        existing.seguro_social      = raw.get("seguro_social", Decimal("0.009"))
        existing.fuente             = fuente
    else:
        db.add(ValorUfUtm(
            periodo=periodo,
            valor_uf=raw["uf"], valor_utm=raw["utm"],
            sueldo_minimo=raw["sueldo_minimo"], tope_gratificacion=raw["tope_gratif"],
            renta_tope_afp=raw["renta_tope_afp"], renta_tope_afc=raw["renta_tope_afc"],
            sis=raw["sis"],
            aporte_empleador_afp=raw.get("aporte_empleador_afp", Decimal("0.001")),
            seguro_social=raw.get("seguro_social", Decimal("0.009")),
            fuente=fuente,
        ))
    await db.flush()

    # Recalcular tramos IU desde el nuevo UTM
    utm_nuevo = raw["utm"]
    await db.execute(delete(TramoImpuestoUnico).where(TramoImpuestoUnico.periodo == periodo))
    for desde, hasta, factor, rebaja in calcular_tramos_desde_utm(utm_nuevo):
        db.add(TramoImpuestoUnico(periodo=periodo, desde=desde, hasta=hasta, factor=factor, monto_rebaja=rebaja))
    await db.flush()
    log.info("Indicadores y tramos IU %s refrescados desde %s (UTM=%s)", periodo, fuente, utm_nuevo)


async def construir_indicadores(db: AsyncSession, emp: Empleado, periodo: str) -> IndicadoresPrevired:
    """Construye los indicadores del período combinando BD versionada (UF/UTM/tramos/topes)
    con las tasas propias del empleado, ya gobernadas por las tablas erp.afp / erp.tipo_contrato."""
    await asegurar_indicadores(db, periodo)
    val          = await obtener_valor_periodo(db, periodo)
    tramos_rows  = await obtener_tramos_periodo(db, periodo)
    tramos       = [(t.desde, t.hasta, t.factor, t.monto_rebaja) for t in tramos_rows]

    tasa_afp = emp.afp_rel.tasa if emp.afp_rel else Decimal("0.1144")
    afc_emp  = emp.tipo_contrato_rel.afc_empleador if emp.tipo_contrato_rel else Decimal("0.030")
    afc_trab = emp.tipo_contrato_rel.afc_trabajador if emp.tipo_contrato_rel else Decimal("0")

    return IndicadoresPrevired(
        periodo=periodo,
        uf=val.valor_uf, utm=val.valor_utm, sis=val.sis,
        sueldo_minimo=val.sueldo_minimo, tope_gratif=val.tope_gratificacion,
        renta_tope_afp=val.renta_tope_afp, renta_tope_afc=val.renta_tope_afc,
        tasa_afp=tasa_afp, tasa_salud=Decimal("0.07"),
        afc_empleador_tasa=afc_emp, afc_trabajador_tasa=afc_trab,
        aporte_empleador_afp=val.aporte_empleador_afp, seguro_social=val.seguro_social,
        tramos_iu=tramos or TRAMOS_IU_2026,
    )
