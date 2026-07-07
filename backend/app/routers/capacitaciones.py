from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date
from pydantic import BaseModel
import io

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.capacitaciones import ProcedimientoCapacitacion, Capacitacion, AsistenteCapacitacion
from app.models.rrhh import Empresa
from app.services.capacitacion_word import generar_capacitacion_docx

router = APIRouter(tags=["Capacitaciones"], dependencies=[Depends(get_current_user)])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ProcedimientoOut(BaseModel):
    id: int
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    activo: bool

    model_config = {"from_attributes": True}


class AsistenteIn(BaseModel):
    orden: int = 1
    nombre: str
    cargo: Optional[str] = None
    rut: Optional[str] = None


class AsistenteOut(AsistenteIn):
    id: int
    model_config = {"from_attributes": True}


class CapacitacionCreate(BaseModel):
    id_procedimiento: Optional[int] = None
    categoria: str
    categoria_tipo: str = "SSO"
    fecha: date
    hora: Optional[str] = None
    obra: Optional[str] = None
    relator_nombre: Optional[str] = None
    relator_cargo: Optional[str] = None
    lugar: Optional[str] = None
    material_apoyo: Optional[str] = None
    duracion_horas: Optional[float] = None
    total_hh: Optional[float] = None
    tema_descripcion: Optional[str] = None
    asistentes: List[AsistenteIn] = []


class CapacitacionOut(BaseModel):
    id: int
    id_empresa: int
    id_procedimiento: Optional[int] = None
    categoria: str
    categoria_tipo: str
    fecha: date
    hora: Optional[str] = None
    obra: Optional[str] = None
    relator_nombre: Optional[str] = None
    relator_cargo: Optional[str] = None
    lugar: Optional[str] = None
    material_apoyo: Optional[str] = None
    duracion_horas: Optional[float] = None
    total_hh: Optional[float] = None
    tema_descripcion: Optional[str] = None
    asistentes: List[AsistenteOut] = []
    procedimiento: Optional[ProcedimientoOut] = None

    model_config = {"from_attributes": True}


# ─── Procedimientos (globales) ─────────────────────────────────────────────────

@router.get("/procedimientos-capacitacion", response_model=List[ProcedimientoOut])
async def listar_procedimientos(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ProcedimientoCapacitacion)
        .where(ProcedimientoCapacitacion.activo == True)
        .order_by(ProcedimientoCapacitacion.id)
    )
    return result.scalars().all()


# ─── Capacitaciones por empresa ────────────────────────────────────────────────

@router.get("/empresas/{id_empresa}/capacitaciones", response_model=List[CapacitacionOut])
async def listar_capacitaciones(id_empresa: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Capacitacion)
        .options(
            selectinload(Capacitacion.asistentes),
            selectinload(Capacitacion.procedimiento),
        )
        .where(Capacitacion.id_empresa == id_empresa)
        .order_by(Capacitacion.fecha.desc(), Capacitacion.id.desc())
    )
    return result.scalars().all()


@router.post("/empresas/{id_empresa}/capacitaciones", response_model=CapacitacionOut)
async def crear_capacitacion(
    id_empresa: int,
    data: CapacitacionCreate,
    db: AsyncSession = Depends(get_db),
):
    cap = Capacitacion(
        id_empresa       = id_empresa,
        id_procedimiento = data.id_procedimiento,
        categoria        = data.categoria,
        categoria_tipo   = data.categoria_tipo,
        fecha            = data.fecha,
        hora             = data.hora,
        obra             = data.obra,
        relator_nombre   = data.relator_nombre,
        relator_cargo    = data.relator_cargo,
        lugar            = data.lugar,
        material_apoyo   = data.material_apoyo,
        duracion_horas   = data.duracion_horas,
        total_hh         = data.total_hh,
        tema_descripcion = data.tema_descripcion,
    )
    db.add(cap)
    await db.flush()

    for i, a in enumerate(data.asistentes):
        db.add(AsistenteCapacitacion(
            id_capacitacion = cap.id,
            orden           = a.orden or (i + 1),
            nombre          = a.nombre,
            cargo           = a.cargo,
            rut             = a.rut,
        ))

    await db.commit()
    await db.refresh(cap)

    result = await db.execute(
        select(Capacitacion)
        .options(
            selectinload(Capacitacion.asistentes),
            selectinload(Capacitacion.procedimiento),
        )
        .where(Capacitacion.id == cap.id)
    )
    return result.scalar_one()


@router.get("/empresas/{id_empresa}/capacitaciones/{id}", response_model=CapacitacionOut)
async def obtener_capacitacion(id_empresa: int, id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Capacitacion)
        .options(
            selectinload(Capacitacion.asistentes),
            selectinload(Capacitacion.procedimiento),
        )
        .where(Capacitacion.id == id, Capacitacion.id_empresa == id_empresa)
    )
    cap = result.scalar_one_or_none()
    if not cap:
        raise HTTPException(404, "Capacitación no encontrada")
    return cap


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
async def descargar_word(id_empresa: int, id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Capacitacion)
        .options(
            selectinload(Capacitacion.asistentes),
            selectinload(Capacitacion.procedimiento),
        )
        .where(Capacitacion.id == id, Capacitacion.id_empresa == id_empresa)
    )
    cap = result.scalar_one_or_none()
    if not cap:
        raise HTTPException(404, "Capacitación no encontrada")

    empresa_result = await db.execute(select(Empresa).where(Empresa.id == id_empresa))
    empresa = empresa_result.scalar_one_or_none()
    empresa_nombre = empresa.razon_social if empresa else ""

    docx_bytes = generar_capacitacion_docx(
        capacitacion   = cap,
        procedimiento  = cap.procedimiento,
        asistentes     = cap.asistentes,
        empresa_nombre = empresa_nombre,
    )

    proc_nombre = cap.procedimiento.codigo if cap.procedimiento else "capacitacion"
    filename = f"Capacitacion_{proc_nombre}_{cap.fecha}.docx".replace(" ", "_")

    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
