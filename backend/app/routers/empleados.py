from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.rrhh import Empleado
from app.schemas.rrhh import EmpleadoCreate, EmpleadoUpdate, EmpleadoOut, EmpleadoListOut

router = APIRouter(prefix="/empleados", tags=["Empleados"], dependencies=[Depends(get_current_user)])

@router.get("/", response_model=List[EmpleadoListOut])
async def listar_empleados(
    activo: Optional[bool] = None,
    id_departamento: Optional[int] = None,
    buscar: Optional[str] = Query(None, description="Buscar por nombre o RUT"),
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    q = select(Empleado).options(
        selectinload(Empleado.departamento),
        selectinload(Empleado.cargo)
    )
    if activo is not None:
        q = q.where(Empleado.activo == activo)
    if id_departamento:
        q = q.where(Empleado.id_departamento == id_departamento)
    if buscar:
        term = f"%{buscar}%"
        q = q.where(
            Empleado.nombres.ilike(term) |
            Empleado.apellido_paterno.ilike(term) |
            Empleado.rut.ilike(term)
        )
    q = q.offset(skip).limit(limit).order_by(Empleado.apellido_paterno)
    result = await db.execute(q)
    return result.scalars().all()

@router.get("/stats")
async def stats_empleados(db: AsyncSession = Depends(get_db)):
    total     = await db.scalar(select(func.count(Empleado.id)))
    activos   = await db.scalar(select(func.count(Empleado.id)).where(Empleado.activo == True))
    inactivos = total - activos
    return {"total": total, "activos": activos, "inactivos": inactivos}

@router.get("/{id}", response_model=EmpleadoOut)
async def obtener_empleado(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Empleado)
        .options(selectinload(Empleado.departamento), selectinload(Empleado.cargo),
                 selectinload(Empleado.contratos), selectinload(Empleado.licencias))
        .where(Empleado.id == id)
    )
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return emp

@router.post("/", response_model=EmpleadoOut, status_code=201)
async def crear_empleado(data: EmpleadoCreate, db: AsyncSession = Depends(get_db)):
    emp = Empleado(**data.model_dump())
    db.add(emp)
    await db.flush()
    await db.refresh(emp, ["departamento", "cargo"])
    return emp

@router.patch("/{id}", response_model=EmpleadoOut)
async def actualizar_empleado(id: int, data: EmpleadoUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Empleado).where(Empleado.id == id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(emp, k, v)
    await db.flush()
    await db.refresh(emp, ["departamento", "cargo"])
    return emp

@router.delete("/{id}", status_code=204)
async def desactivar_empleado(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Empleado).where(Empleado.id == id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    emp.activo = False
