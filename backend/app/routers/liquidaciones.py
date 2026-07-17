"""
Caverco ERP — Router Liquidaciones
Endpoints: calcular preview, emitir, listar por período, detalle, indicadores Previred.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal
from datetime import date, timedelta
import calendar
import logging

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.rrhh import Empleado, Liquidacion, Empresa, ValorUfUtm, Contrato, AFP, TipoContrato, RegistroAsistencia
from app.utils.feriados import es_habil
from app.services.liquidaciones import (
    EntradaLiquidacion, IndicadoresPrevired, calcular_liquidacion, calcular_finiquito
)
from app.services.indicadores import asegurar_indicadores, construir_indicadores, obtener_valor_periodo, obtener_tramos_periodo, refrescar_indicadores
from app.services.previred_export import generar_csv_previred
from app.services.libro_remuneraciones import generar_csv_libro_remuneraciones, nombre_archivo
from app.services.liquidacion_word import generar_liquidacion_docx

log = logging.getLogger(__name__)
router = APIRouter(prefix="/liquidaciones", tags=["Liquidaciones"], dependencies=[Depends(get_current_user)])


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

class FiniquitoRequest(BaseModel):
    id_contrato: int
    fecha_ultimo_feriado: Optional[date] = None   # default: fecha_inicio del contrato
    procede_indemnizacion_anos_servicio: bool = False
    procede_aviso_previo: bool = False
    dias_feriado_anual: int = 15

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
    nombre_empleado: Optional[str] = None   # enriquecido en el endpoint de lista
    model_config = {"from_attributes": True}


# ── Helpers ──────────────────────────────────────────────────────────────

async def _verificar_periodo_abierto(periodo: str, db: AsyncSession):
    result = await db.execute(select(ValorUfUtm).where(ValorUfUtm.periodo == periodo))
    val = result.scalar_one_or_none()
    if val and val.cerrado:
        raise HTTPException(409, f"El período {periodo} está cerrado y no admite nuevas liquidaciones ni pagos")


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
async def obtener_indicadores_periodo(periodo: str, db: AsyncSession = Depends(get_db)):
    """
    Retorna los indicadores previsionales versionados del período (YYYY-MM)
    desde erp.valores_uf_utm / erp.tramos_impuesto_unico. Si el período no
    existe aún, se siembra automáticamente desde Previred/fallback y queda
    registrado para trazabilidad.
    """
    await asegurar_indicadores(db, periodo)
    val    = await obtener_valor_periodo(db, periodo)
    tramos = await obtener_tramos_periodo(db, periodo)
    afps_res = await db.execute(select(AFP).where(AFP.activa == True).order_by(AFP.nombre))
    afps = afps_res.scalars().all()
    tc_res = await db.execute(select(TipoContrato).order_by(TipoContrato.nombre))
    tipos_contrato = tc_res.scalars().all()
    uta = float(val.valor_utm) * 12
    return {
        "periodo": periodo,
        "fuente": val.fuente,
        "cerrado": val.cerrado,
        "indicadores": {
            "uf": float(val.valor_uf), "utm": float(val.valor_utm), "uta": round(uta),
            "sueldo_minimo": float(val.sueldo_minimo), "tope_gratif": float(val.tope_gratificacion),
            "renta_tope_afp": float(val.renta_tope_afp), "renta_tope_afc": float(val.renta_tope_afc),
            "sis": float(val.sis), "aporte_empleador_afp": float(val.aporte_empleador_afp),
            "seguro_social": float(val.seguro_social),
        },
        "afp": [
            {"nombre": a.nombre, "tasa": float(a.tasa)}
            for a in afps
        ],
        "afc": [
            {"nombre": tc.nombre, "codigo": tc.codigo,
             "empleador": float(tc.afc_empleador or 0), "trabajador": float(tc.afc_trabajador or 0)}
            for tc in tipos_contrato if tc.afc_empleador is not None
        ],
        "tramos_impuesto_unico": [
            {"desde": float(t.desde), "hasta": float(t.hasta) if t.hasta is not None else None,
             "factor": float(t.factor), "monto_rebaja": float(t.monto_rebaja)}
            for t in tramos
        ],
    }


@router.post("/indicadores/{periodo}/refrescar", dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def refrescar_indicadores_periodo(periodo: str, db: AsyncSession = Depends(get_db)):
    """Fuerza re-fetch desde Gael Cloud y actualiza el registro en BD (sin tocar períodos cerrados)."""
    val = await obtener_valor_periodo(db, periodo)
    if val and val.cerrado:
        raise HTTPException(400, "El período está cerrado; no se pueden actualizar los indicadores.")
    await refrescar_indicadores(db, periodo)
    val    = await obtener_valor_periodo(db, periodo)
    tramos = await obtener_tramos_periodo(db, periodo)
    afps_res = await db.execute(select(AFP).where(AFP.activa == True).order_by(AFP.nombre))
    afps = afps_res.scalars().all()
    tc_res = await db.execute(select(TipoContrato).order_by(TipoContrato.nombre))
    tipos_contrato = tc_res.scalars().all()
    uta = float(val.valor_utm) * 12
    return {
        "periodo": periodo, "fuente": val.fuente, "cerrado": val.cerrado,
        "indicadores": {
            "uf": float(val.valor_uf), "utm": float(val.valor_utm), "uta": round(uta),
            "sueldo_minimo": float(val.sueldo_minimo), "tope_gratif": float(val.tope_gratificacion),
            "renta_tope_afp": float(val.renta_tope_afp), "renta_tope_afc": float(val.renta_tope_afc),
            "sis": float(val.sis), "aporte_empleador_afp": float(val.aporte_empleador_afp),
            "seguro_social": float(val.seguro_social),
        },
        "afp": [{"nombre": a.nombre, "tasa": float(a.tasa)} for a in afps],
        "afc": [{"nombre": tc.nombre, "codigo": tc.codigo,
                 "empleador": float(tc.afc_empleador or 0), "trabajador": float(tc.afc_trabajador or 0)}
                for tc in tipos_contrato if tc.afc_empleador is not None],
        "tramos_impuesto_unico": [
            {"desde": float(t.desde), "hasta": float(t.hasta) if t.hasta is not None else None,
             "factor": float(t.factor), "monto_rebaja": float(t.monto_rebaja)}
            for t in tramos
        ],
    }


@router.post("/calcular", dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def calcular_preview(req: LiquidacionPreviewRequest, db: AsyncSession = Depends(get_db)):
    """
    Calcula una liquidación sin guardarla (preview), usando los indicadores
    previsionales versionados del período en BD.
    """
    emp     = await _get_empleado(req.id_empleado, db)
    ind     = await construir_indicadores(db, emp, req.periodo)
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


@router.post("/finiquito/calcular", dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def calcular_finiquito_preview(req: FiniquitoRequest, db: AsyncSession = Depends(get_db)):
    """
    Calcula el finiquito (indemnización por años de servicio, sustitutiva de
    aviso previo y vacaciones proporcionales) para un contrato finiquitado.
    Es un cálculo de previsualización: no persiste nada.
    """
    result = await db.execute(select(Contrato).where(Contrato.id == req.id_contrato))
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(404, "Contrato no encontrado")
    if not contrato.fecha_termino_real:
        raise HTTPException(400, "El contrato no tiene fecha de término real; finiquítalo primero")

    periodo = contrato.fecha_termino_real.strftime("%Y-%m")
    val = await obtener_valor_periodo(db, periodo)
    valor_uf = val.valor_uf if val else Decimal("40610.69")

    res = calcular_finiquito(
        sueldo_base=contrato.sueldo_bruto,
        fecha_inicio=contrato.fecha_inicio,
        fecha_termino=contrato.fecha_termino_real,
        fecha_ultimo_feriado=req.fecha_ultimo_feriado or contrato.fecha_inicio,
        valor_uf=valor_uf,
        procede_indemnizacion_anos_servicio=req.procede_indemnizacion_anos_servicio,
        procede_aviso_previo=req.procede_aviso_previo,
        dias_feriado_anual=req.dias_feriado_anual,
    )
    return {
        "id_contrato": contrato.id,
        "fecha_inicio": contrato.fecha_inicio,
        "fecha_termino": contrato.fecha_termino_real,
        "indemnizacion_anos_servicio": int(res.indemnizacion_anos_servicio),
        "indemnizacion_sustitutiva_aviso": int(res.indemnizacion_sustitutiva_aviso),
        "vacaciones_proporcionales": int(res.vacaciones_proporcionales),
        "total_finiquito": int(res.total_finiquito),
    }


@router.post("/emitir", status_code=201, response_model=LiquidacionOut, dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
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

    await _verificar_periodo_abierto(req.periodo, db)

    emp     = await _get_empleado(req.id_empleado, db)
    ind     = await construir_indicadores(db, emp, req.periodo)
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
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, f"Ya existe liquidación para empleado {req.id_empleado} en período {req.periodo}")
    await db.refresh(liq)
    return liq


@router.get("/periodo/{periodo}", response_model=List[LiquidacionOut])
async def listar_por_periodo(
    periodo: str,
    id_empresa: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lista todas las liquidaciones de un período (YYYY-MM), enriquecidas con nombre del empleado."""
    q = select(Liquidacion).where(Liquidacion.periodo == periodo)
    if id_empresa:
        q = q.where(Liquidacion.id_empresa == id_empresa)
    result = await db.execute(q.order_by(Liquidacion.id_empleado))
    liquidaciones = result.scalars().all()

    # Enriquecer con nombres
    if liquidaciones:
        ids = [l.id_empleado for l in liquidaciones]
        emp_res = await db.execute(select(Empleado).where(Empleado.id.in_(ids)))
        emp_map = {e.id: f"{e.nombres} {e.apellido_paterno}" for e in emp_res.scalars().all()}
        out = []
        for liq in liquidaciones:
            d = {c.key: getattr(liq, c.key) for c in liq.__table__.columns}
            d["nombre_empleado"] = emp_map.get(liq.id_empleado, f"Empleado #{liq.id_empleado}")
            out.append(d)
        return out
    return []


async def _liquidaciones_y_empleados(periodo: str, id_empresa: int, db: AsyncSession):
    q = select(Liquidacion).where(Liquidacion.periodo == periodo, Liquidacion.id_empresa == id_empresa)
    result = await db.execute(q.order_by(Liquidacion.id_empleado))
    liquidaciones = result.scalars().all()
    if not liquidaciones:
        raise HTTPException(404, f"No hay liquidaciones para la empresa {id_empresa} en el período {periodo}")

    ids_empleado = [liq.id_empleado for liq in liquidaciones]
    result = await db.execute(
        select(Empleado)
        .options(selectinload(Empleado.afp_rel), selectinload(Empleado.isapre_rel))
        .where(Empleado.id.in_(ids_empleado))
    )
    empleados_por_id = {emp.id: emp for emp in result.scalars().all()}
    return liquidaciones, empleados_por_id


@router.get("/periodo/{periodo}/export/previred")
async def exportar_previred(periodo: str, id_empresa: int, db: AsyncSession = Depends(get_db)):
    liquidaciones, empleados_por_id = await _liquidaciones_y_empleados(periodo, id_empresa, db)
    try:
        contenido = generar_csv_previred(liquidaciones, empleados_por_id)
    except ValueError as e:
        raise HTTPException(422, str(e))
    return Response(
        content=contenido,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="previred_{periodo.replace("-", "")}.csv"'},
    )


@router.get("/periodo/{periodo}/export/libro-remuneraciones")
async def exportar_libro_remuneraciones(periodo: str, id_empresa: int, db: AsyncSession = Depends(get_db)):
    liquidaciones, empleados_por_id = await _liquidaciones_y_empleados(periodo, id_empresa, db)
    result = await db.execute(select(Empresa).where(Empresa.id == id_empresa))
    empresa = result.scalar_one_or_none()
    if not empresa:
        raise HTTPException(404, "Empresa no encontrada")

    try:
        contenido = generar_csv_libro_remuneraciones(liquidaciones, empleados_por_id)
    except ValueError as e:
        raise HTTPException(422, str(e))
    return Response(
        content=contenido,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo(empresa.rut, periodo)}"'},
    )


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
    emp_res = await db.execute(select(Empleado).where(Empleado.id == liq.id_empleado))
    emp = emp_res.scalar_one_or_none()
    d = {c.key: getattr(liq, c.key) for c in liq.__table__.columns}
    d["nombre_empleado"] = f"{emp.nombres} {emp.apellido_paterno}" if emp else f"Empleado #{liq.id_empleado}"
    return d


@router.get("/{id}/word")
async def descargar_liquidacion_word(id: int, db: AsyncSession = Depends(get_db)):
    """Genera y descarga la liquidación en formato Word (.docx)."""
    result = await db.execute(select(Liquidacion).where(Liquidacion.id == id))
    liq = result.scalar_one_or_none()
    if not liq:
        raise HTTPException(404, "Liquidación no encontrada")

    emp = await db.execute(
        select(Empleado)
        .options(selectinload(Empleado.afp_rel), selectinload(Empleado.isapre_rel),
                 selectinload(Empleado.cargo), selectinload(Empleado.centro_costo))
        .where(Empleado.id == liq.id_empleado)
    )
    empleado = emp.scalar_one_or_none()
    if not empleado:
        raise HTTPException(404, "Empleado no encontrado")

    empresa_res = await db.execute(select(Empresa).where(Empresa.id == liq.id_empresa))
    empresa = empresa_res.scalar_one_or_none()

    # Contrato vigente para fecha_ingreso
    contrato_res = await db.execute(
        select(Contrato)
        .where(Contrato.id_empleado == empleado.id)
        .order_by(Contrato.fecha_inicio.desc())
        .limit(1)
    )
    contrato = contrato_res.scalar_one_or_none()

    afp_nombre    = empleado.afp_rel.nombre      if empleado.afp_rel      else "—"
    isapre_nombre = empleado.isapre_rel.nombre   if empleado.isapre_rel   else "—"
    cargo_nombre  = empleado.cargo.nombre         if empleado.cargo         else "—"
    cc_codigo     = empleado.centro_costo.codigo  if empleado.centro_costo  else "—"
    fecha_ingreso = contrato.fecha_inicio if contrato else empleado.fecha_ingreso

    # Obtener logo: base64 data URL o HTTP URL
    logo_bytes: bytes | None = None
    if empresa and empresa.logo_url:
        try:
            if empresa.logo_url.startswith("data:"):
                import base64 as _b64
                _, b64data = empresa.logo_url.split(",", 1)
                logo_bytes = _b64.b64decode(b64data)
            else:
                import httpx
                async with httpx.AsyncClient(timeout=5) as client:
                    r = await client.get(empresa.logo_url)
                    if r.status_code == 200:
                        logo_bytes = r.content
        except Exception as logo_err:
            log.warning("No se pudo obtener el logo: %s", logo_err)

    try:
        docx_bytes = generar_liquidacion_docx(
            empresa=empresa,
            empleado=empleado,
            liquidacion=liq,
            afp_nombre=afp_nombre,
            isapre_nombre=isapre_nombre,
            cargo_nombre=cargo_nombre,
            centro_costo_codigo=cc_codigo,
            fecha_ingreso=fecha_ingreso,
            logo_bytes=logo_bytes,
        )
    except Exception as e:
        log.exception("Error generando Word para liquidacion %s: %s", id, e)
        raise HTTPException(500, f"Error al generar el documento Word: {e}")

    apellidos = f"{empleado.apellido_paterno}".replace(" ", "_")
    filename = f"liquidacion_{liq.periodo}_{apellidos}.docx"
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.patch("/{id}/pagar", response_model=LiquidacionOut,
              dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def marcar_pagada(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Liquidacion).where(Liquidacion.id == id))
    liq = result.scalar_one_or_none()
    if not liq:
        raise HTTPException(404, "Liquidación no encontrada")
    if liq.estado != "EMITIDA":
        raise HTTPException(400, f"Solo se pueden pagar liquidaciones EMITIDAS (estado actual: {liq.estado})")
    await _verificar_periodo_abierto(liq.periodo, db)
    liq.estado = "PAGADA"
    return liq


@router.post("/periodo/{periodo}/cerrar", dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))])
async def cerrar_periodo(periodo: str, db: AsyncSession = Depends(get_db)):
    """Cierra un período: bloquea nuevas emisiones y pagos de liquidaciones para ese YYYY-MM."""
    await asegurar_indicadores(db, periodo)
    result = await db.execute(select(ValorUfUtm).where(ValorUfUtm.periodo == periodo))
    val = result.scalar_one_or_none()
    val.cerrado = True
    return {"periodo": periodo, "cerrado": True}


@router.post("/periodo/{periodo}/reabrir", dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))])
async def reabrir_periodo(periodo: str, db: AsyncSession = Depends(get_db)):
    """Reabre un período previamente cerrado."""
    result = await db.execute(select(ValorUfUtm).where(ValorUfUtm.periodo == periodo))
    val = result.scalar_one_or_none()
    if not val:
        raise HTTPException(404, f"Período {periodo} no encontrado")
    val.cerrado = False
    return {"periodo": periodo, "cerrado": False}


# ── Registro de Asistencia ────────────────────────────────────────────────

class AsistenciaCeldaIn(BaseModel):
    id_empleado: int
    dia: int
    estado: str   # VERDE | ROJO | AUSENTE

@router.get("/asistencia/{periodo}")
async def get_asistencia(
    periodo: str,
    centro_costo_id: Optional[int] = Query(None),
    id_empresa: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna el registro de asistencia del período para los empleados del centro de costo.
    Si no existen registros, los inicializa automáticamente (verde=hábil, rojo=fin de semana/feriado).
    """
    year, month = int(periodo[:4]), int(periodo[5:7])
    dias_en_mes = calendar.monthrange(year, month)[1]

    # Empleados del centro de costo (activos, filtrados por empresa)
    q = select(Empleado).where(Empleado.activo == True)
    if id_empresa:
        q = q.where(Empleado.id_empresa == id_empresa)
    if centro_costo_id:
        # Incluye empleados cuyo perfil O su contrato vigente tiene este CC
        contrato_cc_sub = (
            select(Contrato.id_empleado)
            .where(Contrato.id_centro_costo == centro_costo_id, Contrato.estado == "vigente")
        )
        q = q.where(
            or_(
                Empleado.id_centro_costo == centro_costo_id,
                Empleado.id.in_(contrato_cc_sub),
            )
        )
    q = q.order_by(Empleado.apellido_paterno, Empleado.nombres)
    emps = (await db.execute(q)).scalars().all()

    if not emps:
        return {"dias": dias_en_mes, "empleados": [], "tipo_dia": []}

    emp_ids = [e.id for e in emps]

    # Registros existentes
    rows = (await db.execute(
        select(RegistroAsistencia)
        .where(RegistroAsistencia.periodo == periodo)
        .where(RegistroAsistencia.id_empleado.in_(emp_ids))
    )).scalars().all()

    existentes = {(r.id_empleado, r.dia): r.estado for r in rows}

    # Si faltan registros, inicializar
    nuevos = []
    for emp in emps:
        for d in range(1, dias_en_mes + 1):
            if (emp.id, d) not in existentes:
                dt = date(year, month, d)
                estado = "VERDE" if es_habil(dt) else "ROJO"
                reg = RegistroAsistencia(periodo=periodo, id_empleado=emp.id, dia=d, estado=estado)
                db.add(reg)
                nuevos.append(reg)
                existentes[(emp.id, d)] = estado
    if nuevos:
        await db.flush()

    # Tipo de día para colorear columnas (independiente de empleado)
    tipo_dia = []
    for d in range(1, dias_en_mes + 1):
        dt = date(year, month, d)
        tipo_dia.append("HABIL" if es_habil(dt) else "INHABIL")

    # Contrato vigente por empleado (para colación/movilización)
    contratos_q = await db.execute(
        select(Contrato)
        .where(Contrato.id_empleado.in_(emp_ids))
        .where(Contrato.estado == "vigente")
        .order_by(Contrato.fecha_inicio.desc())
    )
    contratos_all = contratos_q.scalars().all()
    contrato_por_emp = {}
    for c in contratos_all:
        if c.id_empleado not in contrato_por_emp:
            contrato_por_emp[c.id_empleado] = c

    return {
        "dias": dias_en_mes,
        "tipo_dia": tipo_dia,
        "empleados": [
            {
                "id": e.id,
                "nombre": f"{e.nombres} {e.apellido_paterno}",
                "sueldo_base":    float(contrato_por_emp[e.id].sueldo_bruto    or 0) if e.id in contrato_por_emp else 0,
                "horas_semanales": int(contrato_por_emp[e.id].horas_semanales or 42) if e.id in contrato_por_emp else 42,
                "colacion":       float(contrato_por_emp[e.id].colacion       or 0) if e.id in contrato_por_emp else 0,
                "movilizacion":   float(contrato_por_emp[e.id].movilizacion   or 0) if e.id in contrato_por_emp else 0,
                "asistencia": [existentes.get((e.id, d), "VERDE") for d in range(1, dias_en_mes + 1)]
            }
            for e in emps
        ]
    }


@router.patch("/asistencia/{periodo}/celda", dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def patch_asistencia_celda(periodo: str, body: AsistenciaCeldaIn, db: AsyncSession = Depends(get_db)):
    """Actualiza el estado de una celda de asistencia."""
    if body.estado not in ("VERDE", "ROJO", "AUSENTE"):
        raise HTTPException(400, "estado debe ser VERDE, ROJO o AUSENTE")
    row = (await db.execute(
        select(RegistroAsistencia)
        .where(RegistroAsistencia.periodo == periodo)
        .where(RegistroAsistencia.id_empleado == body.id_empleado)
        .where(RegistroAsistencia.dia == body.dia)
    )).scalar_one_or_none()
    if row:
        row.estado = body.estado
    else:
        db.add(RegistroAsistencia(periodo=periodo, id_empleado=body.id_empleado, dia=body.dia, estado=body.estado))
    return {"ok": True}


class AsistenciaGuardarIn(BaseModel):
    celdas: list[AsistenciaCeldaIn]

@router.post("/asistencia/{periodo}/guardar", dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def guardar_asistencia_lote(periodo: str, body: AsistenciaGuardarIn, db: AsyncSession = Depends(get_db)):
    """Guarda múltiples celdas de asistencia en una sola transacción."""
    for celda in body.celdas:
        if celda.estado not in ("VERDE", "ROJO", "AUSENTE"):
            continue
        row = (await db.execute(
            select(RegistroAsistencia)
            .where(RegistroAsistencia.periodo == periodo)
            .where(RegistroAsistencia.id_empleado == celda.id_empleado)
            .where(RegistroAsistencia.dia == celda.dia)
        )).scalar_one_or_none()
        if row:
            row.estado = celda.estado
        else:
            db.add(RegistroAsistencia(periodo=periodo, id_empleado=celda.id_empleado, dia=celda.dia, estado=celda.estado))
    await db.flush()
    return {"ok": True, "guardados": len(body.celdas)}
