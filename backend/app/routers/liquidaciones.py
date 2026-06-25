"""
Caverco ERP — Router Liquidaciones
Endpoints: calcular preview, emitir, listar por período, detalle, indicadores Previred.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal
from datetime import date
import logging

from app.core.database import get_db
from app.models.rrhh import Empleado, Liquidacion
from app.services.liquidaciones import (
    EntradaLiquidacion, IndicadoresPrevired, calcular_liquidacion
)
from app.services.previred import get_previred_service
from app.core.config import settings

log = logging.getLogger(__name__)
router = APIRouter(prefix="/liquidaciones", tags=["Liquidaciones"])


# ── Schemas de entrada/salida ────────────────────────────────────────────

class LiquidacionPreviewRequest(BaseModel):
    id_empleado:     int
    periodo:         str           # YYYY-MM
    dias_trabajados: int = 30
    horas_extra_50:  Decimal = Decimal("0")
    horas_extra_100: Decimal = Decimal("0")
    aguinaldo:       Decimal = Decimal("0")
    colacion:        Decimal = Decimal("0")
    movilizacion:    Decimal = Decimal("0")
    viaticos:        Decimal = Decimal("0")
    asig_familiar:   Decimal = Decimal("0")
    otros_haberes:   Decimal = Decimal("0")
    anticipo:        Decimal = Decimal("0")
    prestamo:        Decimal = Decimal("0")
    otros_descuentos:Decimal = Decimal("0")
    observacion:     Optional[str] = None

class LiquidacionOut(BaseModel):
    id: int
    id_empleado: int
    periodo: str
    sueldo_base: Decimal
    gratificacion: Decimal
    horas_extra_50: Decimal
    horas_extra_100: Decimal
    aguinaldo: Decimal
    total_imponible: Decimal
    colacion: Decimal
    movilizacion: Decimal
    viaticos: Decimal
    asig_familiar: Decimal
    otros_haberes: Decimal
    total_haberes: Decimal
    descuento_afp: Decimal
    descuento_salud: Decimal
    adicional_salud: Decimal
    impuesto_unico: Decimal
    afc_trabajador: Decimal
    total_desc_legales: Decimal
    anticipo: Decimal
    prestamo: Decimal
    total_otros_desc: Decimal
    base_tributaria: Decimal
    liquido_a_pagar: Decimal
    dias_trabajados: int
    estado: str
    observacion: Optional[str] = None
    model_config = {"from_attributes": True}


# ── Helpers ──────────────────────────────────────────────────────────────

async def _get_empleado(id: int, db: AsyncSession) -> Empleado:
    result = await db.execute(
        select(Empleado)
        .options(selectinload(Empleado.afp_rel), selectinload(Empleado.isapre_rel),
                 selectinload(Empleado.tipo_contrato_rel))
        .where(Empleado.id == id)
    )
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(404, "Empleado no encontrado")
    return emp

async def _get_indicadores(periodo: str) -> IndicadoresPrevired:
    """Obtiene indicadores Previred del período, con fallback automático."""
    year, month = int(periodo[:4]), int(periodo[5:7])
    svc = get_previred_service(getattr(settings, "APIGATEWAY_TOKEN", None))
    raw = await svc.obtener_indicadores(year, month)
    return raw   # devuelve dict; se convierte según necesidad


def _build_indicadores(emp: Empleado, raw_ind: dict, periodo: str) -> IndicadoresPrevired:
    afp_nombre = emp.afp_rel.nombre if emp.afp_rel else "Cuprum"
    tipo       = emp.tipo_contrato_rel.codigo if emp.tipo_contrato_rel else "POR_OBRA"
    return IndicadoresPrevired.desde_api(raw_ind, afp_nombre, tipo, periodo)

def _build_entrada(emp: Empleado, req: LiquidacionPreviewRequest) -> EntradaLiquidacion:
    afp_nombre = emp.afp_rel.nombre if emp.afp_rel else "Cuprum"
    tipo       = emp.tipo_contrato_rel.codigo if emp.tipo_contrato_rel else "POR_OBRA"
    es_fonasa  = emp.isapre_rel.es_fonasa if emp.isapre_rel else True
    return EntradaLiquidacion(
        nombre_empleado  = f"{emp.nombres} {emp.apellido_paterno}",
        rut              = emp.rut,
        tipo_contrato    = tipo,
        afp_nombre       = afp_nombre,
        es_fonasa        = es_fonasa,
        valor_isapre_uf  = emp.valor_isapre_uf or Decimal("0"),
        dias_trabajados  = req.dias_trabajados,
        sueldo_base      = emp.sueldo_base or Decimal("0"),
        horas_extra_50   = req.horas_extra_50,
        horas_extra_100  = req.horas_extra_100,
        aguinaldo        = req.aguinaldo,
        colacion         = req.colacion,
        movilizacion     = req.movilizacion,
        viaticos         = req.viaticos,
        asig_familiar    = req.asig_familiar,
        otros_haberes    = req.otros_haberes,
        anticipo         = req.anticipo,
        prestamo         = req.prestamo,
        otros_descuentos = req.otros_descuentos,
    )


# ── Endpoints ────────────────────────────────────────────────────────────

@router.get("/indicadores/{periodo}")
async def obtener_indicadores_previred(periodo: str):
    """
    Retorna indicadores previsionales del período (YYYY-MM) desde Previred
    vía API Gateway. Incluye AFP, AFC, SIS, UF, UTM y rentas topes.
    """
    raw = await _get_indicadores(periodo)
    return {
        "periodo": periodo,
        "fuente":  "API Gateway / Previred",
        "indicadores": raw
    }


@router.post("/calcular")
async def calcular_preview(req: LiquidacionPreviewRequest, db: AsyncSession = Depends(get_db)):
    """
    Calcula una liquidación sin guardarla (preview).
    Usa datos actualizados de Previred para el período indicado.
    """
    emp     = await _get_empleado(req.id_empleado, db)
    raw_ind = await _get_indicadores(req.periodo)
    ind     = _build_indicadores(emp, raw_ind, req.periodo)
    entrada = _build_entrada(emp, req)
    res     = calcular_liquidacion(entrada, ind)

    return {
        "empleado":      {"id": emp.id, "nombre": f"{emp.nombres} {emp.apellido_paterno}", "rut": emp.rut},
        "periodo":       req.periodo,
        "indicadores":   {"uf": float(ind.uf), "utm": float(ind.utm), "tasa_afp": float(ind.tasa_afp), "sis": float(ind.sis)},
        "haberes": {
            "sueldo_base":      int(res.sueldo_base),
            "gratificacion":    int(res.gratificacion),
            "horas_extra_50":   int(res.horas_extra_50),
            "horas_extra_100":  int(res.horas_extra_100),
            "aguinaldo":        int(res.aguinaldo),
            "total_imponible":  int(res.total_imponible),
            "colacion":         int(res.colacion),
            "movilizacion":     int(res.movilizacion),
            "viaticos":         int(res.viaticos),
            "asig_familiar":    int(res.asig_familiar),
            "otros_haberes":    int(res.otros_haberes),
            "total_haberes":    int(res.total_haberes),
        },
        "descuentos_legales": {
            "afp":              int(res.descuento_afp),
            "salud":            int(res.descuento_salud),
            "adicional_salud":  int(res.adicional_salud),
            "afc_trabajador":    int(res.afc_trabajador),
            "base_tributaria":  int(res.base_tributaria),
            "impuesto_unico":   int(res.impuesto_unico),
            "total":            int(res.total_desc_legales),
        },
        "otros_descuentos": {
            "anticipo":  int(res.anticipo),
            "prestamo":  int(res.prestamo),
            "otros":     int(res.otros_descuentos),
            "total":     int(res.total_otros_desc),
        },
        "resultado": {
            "liquido_a_pagar": int(res.liquido_a_pagar),
        },
        "costos_empleador": {
            "afc_empleador":        int(res.afc_empleador),
            "sis":                  int(res.sis_empleador),
            "aporte_empleador_afp": int(res.aporte_empleador_afp),
            "seguro_social":        int(res.seguro_social_empleador),
            "total":                int(res.total_costo_empleador),
        }
    }


@router.post("/emitir", status_code=201)
async def emitir_liquidacion(req: LiquidacionPreviewRequest, db: AsyncSession = Depends(get_db)):
    """
    Calcula y persiste la liquidación con estado EMITIDA.
    Falla si ya existe una liquidación para ese empleado y período.
    """
    # Verificar duplicado
    dup = await db.execute(
        select(Liquidacion).where(
            Liquidacion.id_empleado == req.id_empleado,
            Liquidacion.periodo == req.periodo
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(409, f"Ya existe liquidación para empleado {req.id_empleado} en período {req.periodo}")

    emp     = await _get_empleado(req.id_empleado, db)
    raw_ind = await _get_indicadores(req.periodo)
    ind     = _build_indicadores(emp, raw_ind, req.periodo)
    entrada = _build_entrada(emp, req)
    res     = calcular_liquidacion(entrada, ind)

    liq = Liquidacion(
        id_empresa           = emp.id_empresa,
        id_empleado          = emp.id,
        periodo              = req.periodo,
        id_afp               = emp.id_afp,
        id_isapre            = emp.id_isapre,
        valor_uf             = ind.uf,
        valor_utm            = ind.utm,
        sueldo_base          = res.sueldo_base,
        gratificacion        = res.gratificacion,
        horas_extra_50       = res.horas_extra_50,
        horas_extra_100      = res.horas_extra_100,
        aguinaldo            = res.aguinaldo,
        colacion             = res.colacion,
        movilizacion         = res.movilizacion,
        viaticos             = res.viaticos,
        asig_familiar        = res.asig_familiar,
        otros_haberes        = res.otros_haberes,
        total_haberes        = res.total_haberes,
        descuento_afp        = res.descuento_afp,
        descuento_salud      = res.descuento_salud,
        adicional_salud      = res.adicional_salud,
        impuesto_unico       = res.impuesto_unico,
        afc_trabajador = res.afc_trabajador,
        total_desc_legales   = res.total_desc_legales,
        anticipo             = res.anticipo,
        prestamo             = res.prestamo,
        total_otros_desc     = res.total_otros_desc,
        base_tributaria      = res.base_tributaria,
        liquido_a_pagar      = res.liquido_a_pagar,
        dias_trabajados           = req.dias_trabajados,
        afc_empleador             = res.afc_empleador,
        sis_empleador             = res.sis_empleador,
        aporte_empleador_afp      = res.aporte_empleador_afp,
        seguro_social_empleador   = res.seguro_social_empleador,
        total_costo_empleador     = res.total_costo_empleador,
        estado                    = "EMITIDA",
        observacion          = req.observacion,
    )
    db.add(liq)
    await db.flush()
    await db.refresh(liq)
    return liq


@router.get("/periodo/{periodo}", response_model=List[LiquidacionOut])
async def listar_por_periodo(
    periodo: str,
    id_empresa: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lista todas las liquidaciones de un período (YYYY-MM)."""
    q = select(Liquidacion).where(Liquidacion.periodo == periodo)
    if id_empresa:
        q = q.where(Liquidacion.id_empresa == id_empresa)
    result = await db.execute(q.order_by(Liquidacion.id_empleado))
    return result.scalars().all()


@router.get("/empleado/{id_empleado}", response_model=List[LiquidacionOut])
async def listar_por_empleado(id_empleado: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Liquidacion)
        .where(Liquidacion.id_empleado == id_empleado)
        .order_by(Liquidacion.periodo.desc())
    )
    return result.scalars().all()


@router.get("/{id}", response_model=LiquidacionOut)
async def obtener_liquidacion(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Liquidacion).where(Liquidacion.id == id))
    liq = result.scalar_one_or_none()
    if not liq:
        raise HTTPException(404, "Liquidación no encontrada")
    return liq


@router.patch("/{id}/pagar", response_model=LiquidacionOut)
async def marcar_pagada(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Liquidacion).where(Liquidacion.id == id))
    liq = result.scalar_one_or_none()
    if not liq:
        raise HTTPException(404, "Liquidación no encontrada")
    if liq.estado != "EMITIDA":
        raise HTTPException(400, f"Solo se pueden pagar liquidaciones EMITIDAS (estado actual: {liq.estado})")
    liq.estado = "PAGADA"
    return liq
