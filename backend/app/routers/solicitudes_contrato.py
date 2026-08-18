"""
Solicitudes de datos para contrato (admin): generar/listar/gestionar los
enlaces públicos reutilizables por empresa, y ver las postulaciones que
llegan por cada uno. El formulario público en sí vive en
app.routers.postulacion_publica (sin autenticación).
"""
import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.solicitud_contrato import EnlacePostulacion, PostulacionContrato

router = APIRouter(
    prefix="/empresas/{id_empresa}/solicitudes-contrato",
    tags=["Solicitudes de Contrato"],
    dependencies=[Depends(get_current_user)],
)


# ── Enlaces ──────────────────────────────────────────────────────────────────

class EnlaceOut(BaseModel):
    id: int
    token: str
    nombre_referencia: Optional[str] = None
    activo: bool
    created_at: datetime
    total_postulaciones: int = 0

    class Config:
        from_attributes = True


class EnlaceCreateIn(BaseModel):
    nombre_referencia: Optional[str] = None


@router.get("/enlaces", response_model=list[EnlaceOut])
async def listar_enlaces(id_empresa: int, db: AsyncSession = Depends(get_db)):
    enlaces = (await db.execute(
        select(EnlacePostulacion)
        .where(EnlacePostulacion.id_empresa == id_empresa)
        .order_by(EnlacePostulacion.created_at.desc())
    )).scalars().all()

    conteos = dict((await db.execute(
        select(PostulacionContrato.id_enlace, func.count())
        .where(PostulacionContrato.id_enlace.in_([e.id for e in enlaces]))
        .group_by(PostulacionContrato.id_enlace)
    )).all()) if enlaces else {}

    return [
        EnlaceOut(id=e.id, token=e.token, nombre_referencia=e.nombre_referencia, activo=e.activo,
                  created_at=e.created_at, total_postulaciones=conteos.get(e.id, 0))
        for e in enlaces
    ]


@router.post("/enlaces", response_model=EnlaceOut, status_code=201,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def crear_enlace(id_empresa: int, datos: EnlaceCreateIn, db: AsyncSession = Depends(get_db)):
    enlace = EnlacePostulacion(
        id_empresa=id_empresa,
        token=secrets.token_urlsafe(24),
        nombre_referencia=datos.nombre_referencia,
    )
    db.add(enlace)
    await db.flush()
    await db.refresh(enlace)
    return EnlaceOut(id=enlace.id, token=enlace.token, nombre_referencia=enlace.nombre_referencia,
                      activo=enlace.activo, created_at=enlace.created_at, total_postulaciones=0)


class EnlaceUpdateIn(BaseModel):
    activo: bool


@router.patch("/enlaces/{id_enlace}", response_model=EnlaceOut,
              dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def actualizar_enlace(id_empresa: int, id_enlace: int, datos: EnlaceUpdateIn, db: AsyncSession = Depends(get_db)):
    enlace = await db.get(EnlacePostulacion, id_enlace)
    if not enlace or enlace.id_empresa != id_empresa:
        raise HTTPException(404, "Enlace no encontrado")
    enlace.activo = datos.activo
    await db.flush()
    total = (await db.execute(
        select(func.count()).select_from(PostulacionContrato)
        .where(PostulacionContrato.id_enlace == id_enlace)
    )).scalar_one()
    return EnlaceOut(id=enlace.id, token=enlace.token, nombre_referencia=enlace.nombre_referencia,
                      activo=enlace.activo, created_at=enlace.created_at, total_postulaciones=total)


@router.delete("/enlaces/{id_enlace}", status_code=204,
               dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def eliminar_enlace(id_empresa: int, id_enlace: int, db: AsyncSession = Depends(get_db)):
    enlace = await db.get(EnlacePostulacion, id_enlace)
    if not enlace or enlace.id_empresa != id_empresa:
        raise HTTPException(404, "Enlace no encontrado")
    await db.delete(enlace)


# ── Postulaciones ────────────────────────────────────────────────────────────

class PostulacionOut(BaseModel):
    id: int
    id_enlace: int
    nombre_referencia: Optional[str] = None
    estado: str
    rut: Optional[str] = None
    nombres: Optional[str] = None
    apellido_paterno: Optional[str] = None
    apellido_materno: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    genero: Optional[str] = None
    estado_civil: Optional[str] = None
    nacionalidad: Optional[str] = None
    direccion: Optional[str] = None
    comuna: Optional[str] = None
    region: Optional[str] = None
    ciudad: Optional[str] = None
    telefono: Optional[str] = None
    email_personal: Optional[str] = None
    id_afp: Optional[int] = None
    id_isapre: Optional[int] = None
    valor_isapre_uf: Optional[Decimal] = None
    n_cargas: Optional[int] = None
    banco: Optional[str] = None
    tipo_cuenta: Optional[str] = None
    numero_cuenta: Optional[str] = None
    contacto_emergencia_nombre: Optional[str] = None
    contacto_emergencia_telefono: Optional[str] = None
    id_empleado_generado: Optional[int] = None
    created_at: datetime
    convertido_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.get("/postulaciones", response_model=list[PostulacionOut])
async def listar_postulaciones(id_empresa: int, db: AsyncSession = Depends(get_db)):
    filas = (await db.execute(
        select(PostulacionContrato, EnlacePostulacion.nombre_referencia)
        .join(EnlacePostulacion, EnlacePostulacion.id == PostulacionContrato.id_enlace)
        .where(EnlacePostulacion.id_empresa == id_empresa)
        .order_by(PostulacionContrato.created_at.desc())
    )).all()

    out = []
    for p, nombre_referencia in filas:
        d = PostulacionOut.model_validate(p).model_dump()
        d["nombre_referencia"] = nombre_referencia
        out.append(PostulacionOut(**d))
    return out


@router.delete("/postulaciones/{id_postulacion}", status_code=204,
               dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def eliminar_postulacion(id_empresa: int, id_postulacion: int, db: AsyncSession = Depends(get_db)):
    postulacion = await db.get(PostulacionContrato, id_postulacion)
    if not postulacion:
        raise HTTPException(404, "Postulación no encontrada")
    enlace = await db.get(EnlacePostulacion, postulacion.id_enlace)
    if not enlace or enlace.id_empresa != id_empresa:
        raise HTTPException(404, "Postulación no encontrada")
    await db.delete(postulacion)


@router.post("/postulaciones/{id_postulacion}/marcar-convertida", response_model=PostulacionOut,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def marcar_convertida(id_empresa: int, id_postulacion: int, id_empleado: int, db: AsyncSession = Depends(get_db)):
    postulacion = await db.get(PostulacionContrato, id_postulacion)
    if not postulacion:
        raise HTTPException(404, "Postulación no encontrada")
    enlace = await db.get(EnlacePostulacion, postulacion.id_enlace)
    if not enlace or enlace.id_empresa != id_empresa:
        raise HTTPException(404, "Postulación no encontrada")
    postulacion.estado = "CONVERTIDA"
    postulacion.id_empleado_generado = id_empleado
    postulacion.convertido_at = datetime.utcnow()
    await db.flush()
    await db.refresh(postulacion)
    d = PostulacionOut.model_validate(postulacion).model_dump()
    d["nombre_referencia"] = enlace.nombre_referencia
    return PostulacionOut(**d)
