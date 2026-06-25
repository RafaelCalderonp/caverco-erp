from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.rrhh import Licencia
from app.schemas.rrhh import LicenciaCreate, LicenciaUpdate, LicenciaOut

router = APIRouter(prefix="/empleados/{id_empleado}/licencias", tags=["Licencias"], dependencies=[Depends(get_current_user)])

@router.get("/", response_model=List[LicenciaOut])
async def listar(id_empleado: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Licencia).where(Licencia.id_empleado == id_empleado).order_by(Licencia.fecha_inicio.desc())
    )
    return result.scalars().all()

@router.post("/", response_model=LicenciaOut, status_code=201)
async def crear(id_empleado: int, data: LicenciaCreate, db: AsyncSession = Depends(get_db)):
    lic = Licencia(id_empleado=id_empleado, **data.model_dump())
    db.add(lic)
    await db.flush()
    await db.refresh(lic)
    return lic

@router.patch("/{id}", response_model=LicenciaOut)
async def actualizar(id_empleado: int, id: int, data: LicenciaUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Licencia).where(Licencia.id == id, Licencia.id_empleado == id_empleado))
    lic = result.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=404, detail="Licencia no encontrada")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(lic, k, v)
    if data.estado in ("APROBADA", "RECHAZADA") and not lic.fecha_aprobacion:
        lic.fecha_aprobacion = datetime.utcnow()
    return lic
