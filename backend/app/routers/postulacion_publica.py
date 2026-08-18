"""
Formulario público (sin autenticación) donde un futuro trabajador completa
sus datos personales a partir de un enlace generado por la empresa. El
token fija la empresa: quien completa el formulario no puede verla ni
cambiarla. Un mismo enlace es reutilizable: cada envío crea una postulación
nueva, sin pisar las anteriores. Ver también app.routers.solicitudes_contrato
(lado admin).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import date

from app.core.database import get_db
from app.models.solicitud_contrato import EnlacePostulacion, PostulacionContrato
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


class EnlacePublicoOut(BaseModel):
    activo: bool
    empresa: EmpresaPublicaOut
    afp: list[CatalogoItem]
    isapre: list[CatalogoItem]


class PostulacionPublicaIn(BaseModel):
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
    valor_isapre_uf: Optional[float] = None
    n_cargas: Optional[int] = 0
    banco: Optional[str] = None
    tipo_cuenta: Optional[str] = None
    numero_cuenta: Optional[str] = None
    contacto_emergencia_nombre: Optional[str] = None
    contacto_emergencia_telefono: Optional[str] = None


async def _obtener_enlace(db: AsyncSession, token: str) -> EnlacePostulacion:
    result = await db.execute(select(EnlacePostulacion).where(EnlacePostulacion.token == token))
    enlace = result.scalar_one_or_none()
    if not enlace:
        raise HTTPException(404, "Enlace no válido")
    return enlace


@router.get("/{token}", response_model=EnlacePublicoOut)
async def obtener(token: str, db: AsyncSession = Depends(get_db)):
    enlace = await _obtener_enlace(db, token)
    empresa = await db.get(Empresa, enlace.id_empresa)
    if not empresa:
        raise HTTPException(404, "Enlace no válido")

    afps = (await db.execute(select(AFP).where(AFP.activa == True).order_by(AFP.nombre))).scalars().all()
    isapres = (await db.execute(select(Isapre).where(Isapre.activa == True).order_by(Isapre.nombre))).scalars().all()

    return EnlacePublicoOut(
        activo=enlace.activo,
        empresa=EmpresaPublicaOut(razon_social=empresa.razon_social, nombre_fantasia=empresa.nombre_fantasia, logo_url=empresa.logo_url),
        afp=[CatalogoItem(id=a.id, nombre=a.nombre) for a in afps],
        isapre=[CatalogoItem(id=i.id, nombre=i.nombre, es_fonasa=i.es_fonasa) for i in isapres],
    )


@router.post("/{token}")
async def enviar(token: str, datos: PostulacionPublicaIn, db: AsyncSession = Depends(get_db)):
    enlace = await _obtener_enlace(db, token)
    if not enlace.activo:
        raise HTTPException(400, "Este enlace ya no está disponible. Contacta a la empresa para obtener uno nuevo.")

    postulacion = PostulacionContrato(id_enlace=enlace.id, estado="ENVIADA", **datos.model_dump())
    db.add(postulacion)
    await db.flush()
    return {"ok": True}
