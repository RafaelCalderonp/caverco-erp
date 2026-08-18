"""
Solicitudes de datos para contrato (admin): generar/listar/gestionar los
enlaces públicos por empresa. El formulario público en sí vive en
app.routers.postulacion_publica (sin autenticación).
"""
import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.solicitud_contrato import SolicitudContrato

router = APIRouter(
    prefix="/empresas/{id_empresa}/solicitudes-contrato",
    tags=["Solicitudes de Contrato"],
    dependencies=[Depends(get_current_user)],
)


class SolicitudOut(BaseModel):
    id: int
    token: str
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
    enviado_at: Optional[datetime] = None
    convertido_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SolicitudCreateIn(BaseModel):
    nombre_referencia: Optional[str] = None


@router.get("", response_model=list[SolicitudOut])
async def listar(id_empresa: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SolicitudContrato)
        .where(SolicitudContrato.id_empresa == id_empresa)
        .order_by(SolicitudContrato.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=SolicitudOut, status_code=201,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def crear(id_empresa: int, datos: SolicitudCreateIn, db: AsyncSession = Depends(get_db)):
    solicitud = SolicitudContrato(
        id_empresa=id_empresa,
        token=secrets.token_urlsafe(24),
        nombre_referencia=datos.nombre_referencia,
    )
    db.add(solicitud)
    await db.flush()
    await db.refresh(solicitud)
    return solicitud


@router.delete("/{id_solicitud}", status_code=204,
               dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def eliminar(id_empresa: int, id_solicitud: int, db: AsyncSession = Depends(get_db)):
    solicitud = await db.get(SolicitudContrato, id_solicitud)
    if not solicitud or solicitud.id_empresa != id_empresa:
        raise HTTPException(404, "Solicitud no encontrada")
    await db.delete(solicitud)


@router.post("/{id_solicitud}/marcar-convertida", response_model=SolicitudOut,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def marcar_convertida(id_empresa: int, id_solicitud: int, id_empleado: int, db: AsyncSession = Depends(get_db)):
    solicitud = await db.get(SolicitudContrato, id_solicitud)
    if not solicitud or solicitud.id_empresa != id_empresa:
        raise HTTPException(404, "Solicitud no encontrada")
    solicitud.estado = "CONVERTIDA"
    solicitud.id_empleado_generado = id_empleado
    solicitud.convertido_at = datetime.utcnow()
    await db.flush()
    await db.refresh(solicitud)
    return solicitud
