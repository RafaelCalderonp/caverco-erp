from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date
from pydantic import BaseModel
import io
from urllib.parse import quote

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.capacitaciones import ProcedimientoCapacitacion, Capacitacion, AsistenteCapacitacion
from app.models.rrhh import Empresa, Empleado
from app.services.capacitacion_word import (
    generar_capacitacion_docx,
    generar_capacitacion_archimet_docx,
    generar_reglamento_docx,
    generar_epp_docx,
    generar_certificado_antiguedad_docx,
)

router = APIRouter(tags=["Capacitaciones"], dependencies=[Depends(get_current_user)])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ProcedimientoOut(BaseModel):
    id: int
    codigo: str
    nombre: str
    objetivo_general: Optional[str] = None
    objetivos_especificos: Optional[str] = None
    activo: bool
    empresa_rut_filtro: Optional[str] = None
    model_config = {"from_attributes": True}


class AsistenteIn(BaseModel):
    orden: int = 1
    nombre: str
    area: Optional[str] = None
    rut: Optional[str] = None


class AsistenteOut(AsistenteIn):
    id: int
    model_config = {"from_attributes": True}


class CapacitacionCreate(BaseModel):
    id_procedimiento: Optional[int] = None
    version: str = "01"
    motivo: str = "CAPACITACION"
    fecha: date
    hora_inicio: Optional[str] = None
    hora_termino: Optional[str] = None
    duracion_horas: Optional[float] = None
    obra: Optional[str] = None
    relator_nombre: Optional[str] = None
    relator_area: Optional[str] = None
    relator_rut: Optional[str] = None
    objetivo_general: Optional[str] = None
    objetivos_especificos: Optional[str] = None
    lugar_establecimiento: Optional[str] = None
    material_apoyo: Optional[str] = None
    asistentes: List[AsistenteIn] = []


class CapacitacionOut(BaseModel):
    id: int
    id_empresa: int
    id_procedimiento: Optional[int] = None
    version: str
    motivo: str
    fecha: date
    hora_inicio: Optional[str] = None
    hora_termino: Optional[str] = None
    duracion_horas: Optional[float] = None
    obra: Optional[str] = None
    relator_nombre: Optional[str] = None
    relator_area: Optional[str] = None
    relator_rut: Optional[str] = None
    objetivo_general: Optional[str] = None
    objetivos_especificos: Optional[str] = None
    lugar_establecimiento: Optional[str] = None
    material_apoyo: Optional[str] = None
    asistentes: List[AsistenteOut] = []
    procedimiento: Optional[ProcedimientoOut] = None
    model_config = {"from_attributes": True}


class EntregaReglamentoCreate(BaseModel):
    id_empleado: Optional[int] = None
    nombre_trabajador: str
    rut_trabajador: Optional[str] = None
    seccion: Optional[str] = None
    fecha_entrega: date


class CertificadoAntiguedadCreate(BaseModel):
    id_empleado: Optional[int] = None
    nombre_trabajador: str
    rut_trabajador: Optional[str] = None
    cargo: Optional[str] = None
    fecha_ingreso: date
    tipo_contrato: str = "INDEFINIDO"
    ciudad: str = "Santiago"
    fecha_emision: Optional[date] = None


class EntregaEppCreate(BaseModel):
    id_empleado: Optional[int] = None
    nombre_trabajador: str
    rut_trabajador: Optional[str] = None
    cargo: Optional[str] = None
    obra: Optional[str] = None
    fecha_entrega: date
    entregado_por: Optional[str] = "Salvador Calderón"
    items: List[dict] = []   # [{elemento, cantidad, fecha?}]


# ─── Procedimientos ────────────────────────────────────────────────────────────

@router.get("/procedimientos-capacitacion", response_model=List[ProcedimientoOut])
async def listar_procedimientos(
    empresa_rut: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    q = select(ProcedimientoCapacitacion).where(ProcedimientoCapacitacion.activo == True)
    if empresa_rut:
        q = q.where(
            or_(
                ProcedimientoCapacitacion.empresa_rut_filtro == None,
                ProcedimientoCapacitacion.empresa_rut_filtro == empresa_rut,
            )
        )
    else:
        q = q.where(ProcedimientoCapacitacion.empresa_rut_filtro == None)
    result = await db.execute(q.order_by(ProcedimientoCapacitacion.id))
    return result.scalars().all()


# ─── Capacitaciones ────────────────────────────────────────────────────────────

@router.get("/empresas/{id_empresa}/capacitaciones", response_model=List[CapacitacionOut])
async def listar_capacitaciones(id_empresa: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Capacitacion)
        .options(selectinload(Capacitacion.asistentes), selectinload(Capacitacion.procedimiento))
        .where(Capacitacion.id_empresa == id_empresa)
        .order_by(Capacitacion.fecha.desc(), Capacitacion.id.desc())
    )
    return result.scalars().all()


@router.post("/empresas/{id_empresa}/capacitaciones", response_model=CapacitacionOut)
async def crear_capacitacion(id_empresa: int, data: CapacitacionCreate, db: AsyncSession = Depends(get_db)):
    cap = Capacitacion(
        id_empresa          = id_empresa,
        id_procedimiento    = data.id_procedimiento,
        version             = data.version,
        motivo              = data.motivo,
        fecha               = data.fecha,
        hora_inicio         = data.hora_inicio,
        hora_termino        = data.hora_termino,
        duracion_horas      = data.duracion_horas,
        obra                = data.obra,
        relator_nombre      = data.relator_nombre,
        relator_area        = data.relator_area,
        relator_rut         = data.relator_rut,
        objetivo_general    = data.objetivo_general,
        objetivos_especificos = data.objetivos_especificos,
        lugar_establecimiento = data.lugar_establecimiento,
        material_apoyo      = data.material_apoyo,
    )
    db.add(cap)
    await db.flush()

    for i, a in enumerate(data.asistentes):
        db.add(AsistenteCapacitacion(
            id_capacitacion = cap.id,
            orden  = a.orden or (i + 1),
            nombre = a.nombre,
            area   = a.area,
            rut    = a.rut,
        ))

    await db.commit()

    result = await db.execute(
        select(Capacitacion)
        .options(selectinload(Capacitacion.asistentes), selectinload(Capacitacion.procedimiento))
        .where(Capacitacion.id == cap.id)
    )
    return result.scalar_one()


@router.delete("/empresas/{id_empresa}/capacitaciones/{id}", status_code=204)
async def eliminar_capacitacion(id_empresa: int, id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Capacitacion).where(Capacitacion.id == id, Capacitacion.id_empresa == id_empresa)
    )
    cap = result.scalar_one_or_none()
    if not cap:
        raise HTTPException(404, "Capacitación no encontrada")
    await db.delete(cap)
    await db.commit()


@router.get("/empresas/{id_empresa}/capacitaciones/{id}/word")
async def descargar_word_capacitacion(id_empresa: int, id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Capacitacion)
        .options(selectinload(Capacitacion.asistentes), selectinload(Capacitacion.procedimiento))
        .where(Capacitacion.id == id, Capacitacion.id_empresa == id_empresa)
    )
    cap = result.scalar_one_or_none()
    if not cap:
        raise HTTPException(404, "Capacitación no encontrada")

    empresa_res = await db.execute(select(Empresa).where(Empresa.id == id_empresa))
    empresa = empresa_res.scalar_one_or_none()

    docx_bytes = generar_capacitacion_docx(
        capacitacion   = cap,
        procedimiento  = cap.procedimiento,
        asistentes     = cap.asistentes,
        empresa_nombre = empresa.razon_social if empresa else "",
        empresa        = empresa,
    )
    cod = cap.procedimiento.codigo if cap.procedimiento else str(id)
    d = cap.fecha
    yymmdd = d.strftime("%y%m%d") if hasattr(d, "strftime") else str(d).replace("-", "")[2:]
    fname = f"{yymmdd}_Capacitacion_{cod}.docx"

    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(fname)}"},
    )


@router.get("/empresas/{id_empresa}/capacitaciones/{id}/word-archimet")
async def descargar_word_archimet(id_empresa: int, id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Capacitacion)
        .options(selectinload(Capacitacion.asistentes), selectinload(Capacitacion.procedimiento))
        .where(Capacitacion.id == id, Capacitacion.id_empresa == id_empresa)
    )
    cap = result.scalar_one_or_none()
    if not cap:
        raise HTTPException(404, "Capacitación no encontrada")

    empresa_res = await db.execute(select(Empresa).where(Empresa.id == id_empresa))
    empresa = empresa_res.scalar_one_or_none()

    docx_bytes = generar_capacitacion_archimet_docx(
        capacitacion  = cap,
        procedimiento = cap.procedimiento,
        asistentes    = cap.asistentes,
        empresa       = empresa,
    )
    proc_nombre = cap.procedimiento.nombre if cap.procedimiento else f"Capacitacion_{id}"
    d = cap.fecha
    yymmdd = d.strftime("%y%m%d") if hasattr(d, "strftime") else str(d).replace("-", "")[2:]
    fname = f"{yymmdd} {proc_nombre}.docx"

    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(fname)}"},
    )


# ─── Entrega de Reglamento Interno ────────────────────────────────────────────

@router.post("/empresas/{id_empresa}/reglamento-interno/word")
async def generar_reglamento_interno(
    id_empresa: int,
    data: EntregaReglamentoCreate,
    db: AsyncSession = Depends(get_db),
):
    empresa_res = await db.execute(select(Empresa).where(Empresa.id == id_empresa))
    empresa = empresa_res.scalar_one_or_none()

    nombre = data.nombre_trabajador
    rut    = data.rut_trabajador or ""
    seccion = data.seccion or ""

    # Si viene id_empleado, enriquecer datos
    if data.id_empleado:
        emp_res = await db.execute(select(Empleado).where(Empleado.id == data.id_empleado))
        emp = emp_res.scalar_one_or_none()
        if emp:
            nombre  = f"{emp.nombre} {emp.apellido_paterno} {emp.apellido_materno or ''}".strip()
            rut     = emp.rut or rut
            seccion = seccion or getattr(emp, "cargo_nombre", "") or ""

    docx_bytes = generar_reglamento_docx(
        nombre         = nombre,
        rut            = rut,
        seccion        = seccion,
        fecha          = data.fecha_entrega,
        empresa_nombre = empresa.razon_social if empresa else "Instalaciones Arquitectónicas SpA",
    )
    fname = f"Reglamento_Interno_{(nombre or 'trabajador').replace(' ','_')}.docx"

    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(fname)}"},
    )


# ─── Entrega de EPP ───────────────────────────────────────────────────────────

@router.post("/empresas/{id_empresa}/entrega-epp/word")
async def generar_entrega_epp(
    id_empresa: int,
    data: EntregaEppCreate,
    db: AsyncSession = Depends(get_db),
):
    empresa_res = await db.execute(select(Empresa).where(Empresa.id == id_empresa))
    empresa = empresa_res.scalar_one_or_none()

    nombre = data.nombre_trabajador
    rut    = data.rut_trabajador or ""
    cargo  = data.cargo or ""
    obra   = data.obra or ""

    if data.id_empleado:
        emp_res = await db.execute(select(Empleado).where(Empleado.id == data.id_empleado))
        emp = emp_res.scalar_one_or_none()
        if emp:
            nombre = f"{emp.nombres} {emp.apellido_paterno} {emp.apellido_materno or ''}".strip()
            rut    = emp.rut or rut
            cargo  = cargo or getattr(emp, "cargo_nombre", "") or ""

    docx_bytes = generar_epp_docx(
        nombre         = nombre,
        rut            = rut,
        cargo          = cargo,
        obra           = obra,
        fecha          = data.fecha_entrega,
        items          = data.items,
        entregado_por  = data.entregado_por or "Salvador Calderón",
        empresa_nombre = empresa.razon_social if empresa else "",
    )
    fname = f"EntregaEPP_{(nombre or 'trabajador').replace(' ','_')}.docx"

    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(fname)}"},
    )


# ─── Certificado de Antigüedad ────────────────────────────────────────────────

@router.post("/empresas/{id_empresa}/certificado-antiguedad/word")
async def generar_cert_antiguedad(
    id_empresa: int,
    data: CertificadoAntiguedadCreate,
    db: AsyncSession = Depends(get_db),
):
    empresa_res = await db.execute(select(Empresa).where(Empresa.id == id_empresa))
    empresa = empresa_res.scalar_one_or_none()

    nombre = data.nombre_trabajador
    rut    = data.rut_trabajador or ""
    cargo  = data.cargo or ""

    if data.id_empleado:
        emp_res = await db.execute(select(Empleado).where(Empleado.id == data.id_empleado))
        emp = emp_res.scalar_one_or_none()
        if emp:
            nombre = f"{emp.nombres} {emp.apellido_paterno} {emp.apellido_materno or ''}".strip()
            rut    = emp.rut or rut
            cargo  = cargo or getattr(emp, "cargo_nombre", "") or ""

    empresa_nombre = empresa.razon_social if empresa else "INSTALACIONES ARQUITECTÓNICAS SpA"
    empresa_rut    = empresa.rut if empresa else "77.868.358-K"

    docx_bytes = generar_certificado_antiguedad_docx(
        nombre         = nombre,
        rut_empleado   = rut,
        cargo          = cargo,
        fecha_ingreso  = data.fecha_ingreso,
        tipo_contrato  = data.tipo_contrato,
        empresa_nombre = empresa_nombre,
        empresa_rut    = empresa_rut,
        ciudad         = data.ciudad,
        fecha_emision  = data.fecha_emision,
        empresa        = empresa,
    )
    fname = f"Certificado_Antiguedad_{(nombre or 'trabajador').replace(' ', '_')}.docx"

    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(fname)}"},
    )
