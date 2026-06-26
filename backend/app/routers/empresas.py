from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.rrhh import Empresa
from app.schemas.rrhh import EmpresaCreate, EmpresaUpdate, EmpresaOut

router = APIRouter(prefix="/empresas", tags=["Empresas"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=List[EmpresaOut])
async def listar(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Empresa).order_by(Empresa.razon_social))
    return result.scalars().all()


@router.get("/{id}", response_model=EmpresaOut)
async def obtener(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Empresa).where(Empresa.id == id))
    empresa = result.scalar_one_or_none()
    if not empresa:
        raise HTTPException(404, "Empresa no encontrada")
    return empresa


@router.post("", response_model=EmpresaOut, status_code=201,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))])
async def crear(data: EmpresaCreate, db: AsyncSession = Depends(get_db)):
    existe = await db.execute(select(Empresa).where(Empresa.rut == data.rut))
    if existe.scalar_one_or_none():
        raise HTTPException(409, "Ya existe una empresa con ese RUT")

    empresa = Empresa(**data.model_dump())
    db.add(empresa)
    await db.flush()
    await db.refresh(empresa)
    return empresa


@router.patch("/{id}", response_model=EmpresaOut,
              dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))])
async def actualizar(id: int, data: EmpresaUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Empresa).where(Empresa.id == id))
    empresa = result.scalar_one_or_none()
    if not empresa:
        raise HTTPException(404, "Empresa no encontrada")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(empresa, k, v)
    return empresa
