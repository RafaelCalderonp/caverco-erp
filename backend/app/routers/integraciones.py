"""
Caverco ERP — Router Integraciones
Credenciales externas por empresa (Previred / Mi DT - Clave Única), guardadas
cifradas solo como referencia para el usuario. La aplicación no realiza login
automático con estos datos: el usuario sigue subiendo los archivos
manualmente en los portales oficiales.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.core.crypto import encrypt, decrypt, mask
from app.models.rrhh import EmpresaCredencial

router = APIRouter(
    prefix="/empresas/{id_empresa}/credenciales",
    tags=["Integraciones"],
    dependencies=[Depends(get_current_user)],
)

TIPOS_VALIDOS = ("PREVIRED", "CLAVE_UNICA")


class CredencialIn(BaseModel):
    usuario: str
    password: str


class CredencialOut(BaseModel):
    tipo: str
    usuario: str
    password_mask: str
    updated_at: str | None = None


def _to_out(cred: EmpresaCredencial) -> CredencialOut:
    return CredencialOut(
        tipo=cred.tipo,
        usuario=cred.usuario,
        password_mask=mask(decrypt(cred.password_cifrada)),
        updated_at=cred.updated_at.isoformat() if cred.updated_at else None,
    )


@router.get("", response_model=List[CredencialOut])
async def listar(id_empresa: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EmpresaCredencial).where(EmpresaCredencial.id_empresa == id_empresa)
    )
    return [_to_out(c) for c in result.scalars().all()]


@router.put(
    "/{tipo}",
    response_model=CredencialOut,
    dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))],
)
async def guardar(id_empresa: int, tipo: str, data: CredencialIn, db: AsyncSession = Depends(get_db)):
    tipo = tipo.upper()
    if tipo not in TIPOS_VALIDOS:
        raise HTTPException(400, f"Tipo inválido. Debe ser uno de: {', '.join(TIPOS_VALIDOS)}")

    result = await db.execute(
        select(EmpresaCredencial).where(
            EmpresaCredencial.id_empresa == id_empresa, EmpresaCredencial.tipo == tipo
        )
    )
    cred = result.scalar_one_or_none()
    if cred:
        cred.usuario = data.usuario
        cred.password_cifrada = encrypt(data.password)
    else:
        cred = EmpresaCredencial(
            id_empresa=id_empresa,
            tipo=tipo,
            usuario=data.usuario,
            password_cifrada=encrypt(data.password),
        )
        db.add(cred)
    await db.flush()
    await db.refresh(cred)
    return _to_out(cred)


@router.delete(
    "/{tipo}",
    status_code=204,
    dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))],
)
async def eliminar(id_empresa: int, tipo: str, db: AsyncSession = Depends(get_db)):
    tipo = tipo.upper()
    result = await db.execute(
        select(EmpresaCredencial).where(
            EmpresaCredencial.id_empresa == id_empresa, EmpresaCredencial.tipo == tipo
        )
    )
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(404, "Credencial no encontrada")
    await db.delete(cred)
