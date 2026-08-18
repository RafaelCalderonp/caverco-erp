"""
Formulario público (sin autenticación) donde un futuro trabajador completa
sus datos personales a partir de un enlace generado por la empresa. El
token fija la empresa: quien completa el formulario no puede verla ni
cambiarla. Ver también app.routers.solicitudes_contrato (lado admin).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

from app.core.database import get_db
from app.models.solicitud_contrato import SolicitudContrato
from app.models.rrhh import Empresa, AFP, Isapre

router = APIRouter(prefix="/postulacion", tags=["Postulación Pública"])


class EmpresaPublicaOut(BaseModel):
    razon_social: str
    nombre_fantasia: Optional[str] = None
    logo_url: Optional[str] = None


class CatalogoItem(BaseModel):
    id: int
    nombre: str
    es_fonasa: Optional[bool] = None


class SolicitudPublicaOut(BaseModel):
    estado: str
    empresa: EmpresaPublicaOut
    afp: list[CatalogoItem]
    isapre: list[CatalogoItem]
    # Si ya había datos guardados (para permitir corregir antes de enviar/convertir)
    datos: Optional[dict] = None


class SolicitudPublicaIn(BaseModel):
    rut: str
    nombres: str
    apellido_paterno: str
    apellido_materno: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    genero: Optional[str] = None
    estado_civil: Optional[str] = None
    nacionalidad: str = "Chilena"
    direccion: Optional[str] = None
    comuna: Optional[str] = None
    region: Optional[str] = None
    ciudad: str = "Santiago"
    telefono: Optional[str] = None
    email_personal: Optional[str] = None
    id_afp: Optional[int] = None
    id_isapre: Optional[int] = None
    valor_isapre_uf: Optional[Decimal] = None
    n_cargas: Optional[int] = 0
    banco: Optional[str] = None
    tipo_cuenta: Optional[str] = None
    numero_cuenta: Optional[str] = None
    contacto_emergencia_nombre: Optional[str] = None
    contacto_emergencia_telefono: Optional[str] = None


async def _obtener_solicitud(db: AsyncSession, token: str) -> SolicitudContrato:
    result = await db.execute(select(SolicitudContrato).where(SolicitudContrato.token == token))
    solicitud = result.scalar_one_or_none()
    if not solicitud:
        raise HTTPException(404, "Enlace no válido o expirado")
    return solicitud


@router.get("/{token}", response_model=SolicitudPublicaOut)
async def obtener(token: str, db: AsyncSession = Depends(get_db)):
    solicitud = await _obtener_solicitud(db, token)
    empresa = await db.get(Empresa, solicitud.id_empresa)
    if not empresa:
        raise HTTPException(404, "Enlace no válido")

    afps = (await db.execute(select(AFP).where(AFP.activa == True).order_by(AFP.nombre))).scalars().all()
    isapres = (await db.execute(select(Isapre).where(Isapre.activa == True).order_by(Isapre.nombre))).scalars().all()

    datos = None
    if solicitud.rut:
        datos = {
            c.key: getattr(solicitud, c.key)
            for c in solicitud.__table__.columns
            if c.key not in ("id", "id_empresa", "token", "estado", "id_empleado_generado", "created_at", "enviado_at", "convertido_at")
        }

    return SolicitudPublicaOut(
        estado=solicitud.estado,
        empresa=EmpresaPublicaOut(razon_social=empresa.razon_social, nombre_fantasia=empresa.nombre_fantasia, logo_url=empresa.logo_url),
        afp=[CatalogoItem(id=a.id, nombre=a.nombre) for a in afps],
        isapre=[CatalogoItem(id=i.id, nombre=i.nombre, es_fonasa=i.es_fonasa) for i in isapres],
        datos=datos,
    )


@router.post("/{token}")
async def enviar(token: str, datos: SolicitudPublicaIn, db: AsyncSession = Depends(get_db)):
    solicitud = await _obtener_solicitud(db, token)
    if solicitud.estado == "CONVERTIDA":
        raise HTTPException(400, "Esta solicitud ya fue procesada y no se puede modificar. Contacta a la empresa si necesitas corregir algo.")

    for campo, valor in datos.model_dump().items():
        setattr(solicitud, campo, valor)
    solicitud.estado = "ENVIADA"
    solicitud.enviado_at = datetime.utcnow()
    await db.flush()
    return {"ok": True}
