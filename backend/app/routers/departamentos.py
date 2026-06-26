from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.rrhh import Departamento, Cargo
from app.schemas.rrhh import DepartamentoCreate, DepartamentoUpdate, DepartamentoOut, CargoOut

router = APIRouter(prefix="/departamentos", tags=["Departamentos"], dependencies=[Depends(get_current_user)])

@router.get("", response_model=List[DepartamentoOut])
async def listar(id_empresa: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(Departamento).where(Departamento.activo == True)
    if id_empresa:
        q = q.where(Departamento.id_empresa == id_empresa)
    result = await db.execute(q.order_by(Departamento.nombre))
    return result.scalars().all()

@router.post("", response_model=DepartamentoOut, status_code=201)
async def crear(data: DepartamentoCreate, db: AsyncSession = Depends(get_db)):
    dep = Departamento(**data.model_dump())
    db.add(dep)
    await db.flush()
    await db.refresh(dep)
    return dep

@router.patch("/{id}", response_model=DepartamentoOut)
async def actualizar(id: int, data: DepartamentoUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Departamento).where(Departamento.id == id))
    dep = result.scalar_one_or_none()
    if not dep:
        raise HTTPException(status_code=404, detail="Departamento no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(dep, k, v)
    return dep

@router.get("/{id}/cargos", response_model=List[CargoOut])
async def cargos_por_departamento(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Cargo).where(Cargo.id_departamento == id, Cargo.activo == True))
    return result.scalars().all()
