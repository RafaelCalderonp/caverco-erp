from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.rrhh import Empleado, Departamento, Cargo
from app.schemas.rrhh import EmpleadoCreate, EmpleadoUpdate, EmpleadoOut, EmpleadoListOut

router = APIRouter(prefix="/empleados", tags=["Empleados"], dependencies=[Depends(get_current_user)])

@router.get("", response_model=List[EmpleadoListOut])
async def listar_empleados(
    id_empresa: Optional[int] = None,
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
    if id_empresa:
        q = q.where(Empleado.id_empresa == id_empresa)
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
async def stats_empleados(id_empresa: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    base = select(func.count(Empleado.id))
    if id_empresa:
        base = base.where(Empleado.id_empresa == id_empresa)
    total     = await db.scalar(base)
    activos   = await db.scalar(base.where(Empleado.activo == True))
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

async def _validar_consistencia_empresa(data: dict, db: AsyncSession) -> None:
    checks = [(Departamento, data.get("id_departamento"), "El departamento"), (Cargo, data.get("id_cargo"), "El cargo")]
    for modelo, valor, etiqueta in checks:
        if valor is None:
            continue
        entidad = await db.get(modelo, valor)
        if entidad is None or entidad.id_empresa != data["id_empresa"]:
            raise HTTPException(status_code=400, detail=f"{etiqueta} no pertenece a la misma empresa del empleado")

@router.post("", response_model=EmpleadoOut, status_code=201)
async def crear_empleado(data: EmpleadoCreate, db: AsyncSession = Depends(get_db)):
    payload = data.model_dump()
    await _validar_consistencia_empresa(payload, db)
    emp = Empleado(**payload)
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
    cambios = data.model_dump(exclude_none=True)
    if {"id_departamento", "id_cargo"} & cambios.keys():
        await _validar_consistencia_empresa({
            "id_empresa": emp.id_empresa,
            "id_departamento": cambios.get("id_departamento", emp.id_departamento),
            "id_cargo": cambios.get("id_cargo", emp.id_cargo),
        }, db)
    for k, v in cambios.items():
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
