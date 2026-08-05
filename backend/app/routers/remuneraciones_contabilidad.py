"""
Integración RRHH -> Contabilidad: genera automáticamente los asientos contables
de remuneraciones a partir de las liquidaciones de un período.

Flujo propuesto (todo el pago se realiza desde Banco Santander):

  1. Se emiten las liquidaciones del período (RRHH, ya existente).
  2. "Generar Asiento de Provisión": un asiento único que devenga el gasto de
     remuneraciones y los aportes patronales, reconociendo los pasivos con
     AFP/AFC/Isapre/SII y con los propios trabajadores (Remuneraciones por Pagar).
  3. Se pagan las liquidaciones (RRHH, ya existente, marca cada una PAGADA).
  4. "Generar Asiento de Pago": cancela Remuneraciones por Pagar contra el
     Banco Santander, por el total pagado del período.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
from datetime import date
from decimal import Decimal

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.rrhh import Liquidacion
from app.models.plan_cuentas import PlanCuenta
from app.models.contabilidad_diario import AsientoContable, AsientoLinea
from app.models.remuneraciones_contabilidad import PlantillaAsientoRemuneraciones, RemuneracionesAsiento
from app.routers.libro_diario import _siguiente_numero

router = APIRouter(
    prefix="/empresas/{id_empresa}/remuneraciones-contabilidad",
    tags=["Remuneraciones - Contabilidad"],
    dependencies=[Depends(get_current_user)],
)

CONCEPTOS = [
    "id_cuenta_gasto_remuneraciones",
    "id_cuenta_gasto_colacion_movilizacion",
    "id_cuenta_gasto_cotizaciones_patronales",
    "id_cuenta_previred_por_pagar",
    "id_cuenta_impuesto_unico_por_pagar",
    "id_cuenta_anticipos_prestamos",
    "id_cuenta_remuneraciones_por_pagar",
    "id_cuenta_banco",
]


# ── Schemas ──────────────────────────────────────────────────────────────────

class CuentaMin(BaseModel):
    id: int
    codigo: str
    nombre: str

    class Config:
        from_attributes = True


class ConfigOut(BaseModel):
    id_empresa: int
    id_cuenta_gasto_remuneraciones: Optional[int] = None
    id_cuenta_gasto_colacion_movilizacion: Optional[int] = None
    id_cuenta_gasto_cotizaciones_patronales: Optional[int] = None
    id_cuenta_previred_por_pagar: Optional[int] = None
    id_cuenta_impuesto_unico_por_pagar: Optional[int] = None
    id_cuenta_anticipos_prestamos: Optional[int] = None
    id_cuenta_remuneraciones_por_pagar: Optional[int] = None
    id_cuenta_banco: Optional[int] = None
    completa: bool


class ConfigIn(BaseModel):
    id_cuenta_gasto_remuneraciones: Optional[int] = None
    id_cuenta_gasto_colacion_movilizacion: Optional[int] = None
    id_cuenta_gasto_cotizaciones_patronales: Optional[int] = None
    id_cuenta_previred_por_pagar: Optional[int] = None
    id_cuenta_impuesto_unico_por_pagar: Optional[int] = None
    id_cuenta_anticipos_prestamos: Optional[int] = None
    id_cuenta_remuneraciones_por_pagar: Optional[int] = None
    id_cuenta_banco: Optional[int] = None


class EstadoPeriodoOut(BaseModel):
    periodo: str
    n_liquidaciones: int
    n_pagadas: int
    total_devengado: Decimal
    total_liquido_pagado: Decimal
    id_asiento_provision: Optional[int] = None
    id_asiento_pago: Optional[int] = None


class GenerarOut(BaseModel):
    id_asiento: int
    numero: str
    total_debe: Decimal
    total_haber: Decimal


# ── Config ───────────────────────────────────────────────────────────────────

@router.get("/config", response_model=ConfigOut)
async def obtener_config(id_empresa: int, db: AsyncSession = Depends(get_db)):
    cfg = await db.get(PlantillaAsientoRemuneraciones, id_empresa)
    if not cfg:
        cfg = PlantillaAsientoRemuneraciones(id_empresa=id_empresa)
    completa = all(getattr(cfg, c) is not None for c in CONCEPTOS)
    return ConfigOut(id_empresa=id_empresa, completa=completa,
                      **{c: getattr(cfg, c) for c in CONCEPTOS})


@router.put("/config", response_model=ConfigOut, dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))])
async def guardar_config(id_empresa: int, datos: ConfigIn, db: AsyncSession = Depends(get_db)):
    ids = {v for v in datos.model_dump().values() if v is not None}
    if ids:
        encontradas = (await db.execute(
            select(PlanCuenta.id).where(
                PlanCuenta.id.in_(ids), PlanCuenta.nivel == "D",
                (PlanCuenta.id_empresa.is_(None)) | (PlanCuenta.id_empresa == id_empresa),
            )
        )).scalars().all()
        faltantes = ids - set(encontradas)
        if faltantes:
            raise HTTPException(400, f"Cuentas no válidas para esta empresa: {faltantes}")

    cfg = await db.get(PlantillaAsientoRemuneraciones, id_empresa)
    if not cfg:
        cfg = PlantillaAsientoRemuneraciones(id_empresa=id_empresa)
        db.add(cfg)
    for campo, valor in datos.model_dump().items():
        setattr(cfg, campo, valor)
    await db.flush()
    completa = all(getattr(cfg, c) is not None for c in CONCEPTOS)
    return ConfigOut(id_empresa=id_empresa, completa=completa,
                      **{c: getattr(cfg, c) for c in CONCEPTOS})


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _requerir_config(db: AsyncSession, id_empresa: int) -> PlantillaAsientoRemuneraciones:
    cfg = await db.get(PlantillaAsientoRemuneraciones, id_empresa)
    if not cfg or any(getattr(cfg, c) is None for c in CONCEPTOS):
        raise HTTPException(400, "Falta configurar el mapeo de cuentas de remuneraciones para esta empresa (Config. Asientos Remuneraciones)")
    return cfg


async def _totales_periodo(db: AsyncSession, id_empresa: int, periodo: str) -> dict:
    row = (await db.execute(
        select(
            func.count(Liquidacion.id),
            func.count(Liquidacion.id).filter(Liquidacion.estado == "PAGADA"),
            func.coalesce(func.sum(Liquidacion.sueldo_base + Liquidacion.gratificacion +
                                    Liquidacion.horas_extra_50 + Liquidacion.horas_extra_100 +
                                    Liquidacion.aguinaldo + Liquidacion.asig_familiar +
                                    Liquidacion.otros_haberes), 0),
            func.coalesce(func.sum(Liquidacion.colacion + Liquidacion.movilizacion + Liquidacion.viaticos), 0),
            func.coalesce(func.sum(Liquidacion.afc_empleador + Liquidacion.sis_empleador +
                                    Liquidacion.aporte_empleador_afp + Liquidacion.seguro_social_empleador), 0),
            # Previred por Pagar: todo lo que se entera junto en la planilla mensual
            # (AFP + SIS + Seguro Social + AFC + Isapre/Fonasa, trabajador y empleador)
            func.coalesce(func.sum(
                Liquidacion.descuento_afp + Liquidacion.aporte_empleador_afp +
                Liquidacion.sis_empleador + Liquidacion.seguro_social_empleador +
                Liquidacion.afc_trabajador + Liquidacion.afc_empleador +
                Liquidacion.descuento_salud + Liquidacion.adicional_salud
            ), 0),
            func.coalesce(func.sum(Liquidacion.impuesto_unico), 0),
            func.coalesce(func.sum(Liquidacion.anticipo + Liquidacion.prestamo), 0),
            func.coalesce(func.sum(Liquidacion.liquido_a_pagar), 0),
            func.coalesce(func.sum(Liquidacion.liquido_a_pagar).filter(Liquidacion.estado == "PAGADA"), 0),
        ).where(Liquidacion.id_empresa == id_empresa, Liquidacion.periodo == periodo)
    )).one()

    campos = [
        "n_liquidaciones", "n_pagadas",
        "gasto_remuneraciones", "gasto_colacion_movilizacion", "gasto_cotizaciones_patronales",
        "previred_por_pagar", "impuesto_unico_por_pagar",
        "anticipos_prestamos", "remuneraciones_por_pagar", "total_liquido_pagado",
    ]
    return dict(zip(campos, row))


# ── Estado del período ───────────────────────────────────────────────────────

@router.get("/periodo/{periodo}", response_model=EstadoPeriodoOut)
async def estado_periodo(id_empresa: int, periodo: str, db: AsyncSession = Depends(get_db)):
    t = await _totales_periodo(db, id_empresa, periodo)
    if t["n_liquidaciones"] == 0:
        raise HTTPException(404, f"No hay liquidaciones para el período {periodo}")

    asientos = {
        r.tipo: r.id_asiento
        for r in (await db.execute(
            select(RemuneracionesAsiento).where(
                RemuneracionesAsiento.id_empresa == id_empresa, RemuneracionesAsiento.periodo == periodo
            )
        )).scalars().all()
    }
    total_devengado = t["gasto_remuneraciones"] + t["gasto_colacion_movilizacion"] + t["gasto_cotizaciones_patronales"]
    return EstadoPeriodoOut(
        periodo=periodo, n_liquidaciones=t["n_liquidaciones"], n_pagadas=t["n_pagadas"],
        total_devengado=total_devengado, total_liquido_pagado=t["total_liquido_pagado"],
        id_asiento_provision=asientos.get("PROVISION"), id_asiento_pago=asientos.get("PAGO"),
    )


# ── Generar asientos ─────────────────────────────────────────────────────────

async def _crear_asiento(db: AsyncSession, id_empresa: int, periodo: str, tipo: str, glosa: str,
                          lineas: list[tuple[int, str, Decimal, Decimal]]) -> AsientoContable:
    periodo_asiento = periodo.replace("-", "")
    numero = await _siguiente_numero(db, id_empresa, periodo_asiento)
    asiento = AsientoContable(
        id_empresa=id_empresa, numero=numero, tipo="RRHH",
        fecha=date.today(), periodo=periodo_asiento, glosa=glosa, estado="BORRADOR",
    )
    db.add(asiento)
    await db.flush()
    for i, (id_cuenta, detalle, debe, haber) in enumerate(lineas, start=1):
        db.add(AsientoLinea(id_asiento=asiento.id, linea=i, id_cuenta=id_cuenta,
                             glosa_detalle=detalle, debe=debe, haber=haber))
    db.add(RemuneracionesAsiento(id_empresa=id_empresa, periodo=periodo, tipo=tipo, id_asiento=asiento.id))
    await db.flush()
    return asiento


@router.post("/periodo/{periodo}/generar-provision", response_model=GenerarOut,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))])
async def generar_provision(id_empresa: int, periodo: str, db: AsyncSession = Depends(get_db)):
    cfg = await _requerir_config(db, id_empresa)

    ya_existe = await db.get(RemuneracionesAsiento, (id_empresa, periodo, "PROVISION"))
    if ya_existe:
        raise HTTPException(400, f"Ya existe un asiento de provisión para {periodo} (N° asiento {ya_existe.id_asiento})")

    t = await _totales_periodo(db, id_empresa, periodo)
    if t["n_liquidaciones"] == 0:
        raise HTTPException(404, f"No hay liquidaciones emitidas para el período {periodo}")

    lineas = [
        (cfg.id_cuenta_gasto_remuneraciones,          "Sueldos y haberes imponibles", t["gasto_remuneraciones"], Decimal("0")),
        (cfg.id_cuenta_gasto_colacion_movilizacion,   "Colación, movilización y viáticos", t["gasto_colacion_movilizacion"], Decimal("0")),
        (cfg.id_cuenta_gasto_cotizaciones_patronales, "Aportes patronales (AFC/SIS/Seg. Social)", t["gasto_cotizaciones_patronales"], Decimal("0")),
        (cfg.id_cuenta_previred_por_pagar,            "Previred por pagar (AFP/SIS/Seg. Social/AFC/Salud)", Decimal("0"), t["previred_por_pagar"]),
        (cfg.id_cuenta_impuesto_unico_por_pagar,      "Impuesto único retenido por pagar (SII)", Decimal("0"), t["impuesto_unico_por_pagar"]),
        (cfg.id_cuenta_anticipos_prestamos,           "Anticipos y préstamos descontados", Decimal("0"), t["anticipos_prestamos"]),
        (cfg.id_cuenta_remuneraciones_por_pagar,      "Remuneraciones por pagar a trabajadores", Decimal("0"), t["remuneraciones_por_pagar"]),
    ]
    # las cuentas en 0 no aportan al cuadre pero se omiten para no ensuciar el asiento
    lineas = [l for l in lineas if l[2] != 0 or l[3] != 0]

    total_debe  = sum(l[2] for l in lineas)
    total_haber = sum(l[3] for l in lineas)
    if total_debe != total_haber:
        raise HTTPException(400, f"El asiento de provisión no cuadra (DEBE={total_debe} HABER={total_haber}); revisa las liquidaciones del período")

    asiento = await _crear_asiento(db, id_empresa, periodo, "PROVISION",
                                    f"Provisión remuneraciones {periodo}", lineas)
    return GenerarOut(id_asiento=asiento.id, numero=asiento.numero, total_debe=total_debe, total_haber=total_haber)


@router.post("/periodo/{periodo}/generar-pago", response_model=GenerarOut,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))])
async def generar_pago(id_empresa: int, periodo: str, db: AsyncSession = Depends(get_db)):
    cfg = await _requerir_config(db, id_empresa)

    provision = await db.get(RemuneracionesAsiento, (id_empresa, periodo, "PROVISION"))
    if not provision:
        raise HTTPException(400, "Primero debes generar el asiento de provisión de este período")

    ya_existe = await db.get(RemuneracionesAsiento, (id_empresa, periodo, "PAGO"))
    if ya_existe:
        raise HTTPException(400, f"Ya existe un asiento de pago para {periodo} (N° asiento {ya_existe.id_asiento})")

    t = await _totales_periodo(db, id_empresa, periodo)
    if t["n_pagadas"] == 0:
        raise HTTPException(400, "No hay liquidaciones marcadas como PAGADA en este período")
    if t["n_pagadas"] != t["n_liquidaciones"]:
        raise HTTPException(400, f"Quedan {t['n_liquidaciones'] - t['n_pagadas']} liquidaciones sin pagar en {periodo}; márcalas como pagadas antes de generar el asiento")

    total = t["total_liquido_pagado"]
    lineas = [
        (cfg.id_cuenta_remuneraciones_por_pagar, "Cancela remuneraciones por pagar", total, Decimal("0")),
        (cfg.id_cuenta_banco,                    "Pago remuneraciones vía Banco Santander", Decimal("0"), total),
    ]
    asiento = await _crear_asiento(db, id_empresa, periodo, "PAGO",
                                    f"Pago remuneraciones {periodo} - Banco Santander", lineas)
    return GenerarOut(id_asiento=asiento.id, numero=asiento.numero, total_debe=total, total_haber=total)
