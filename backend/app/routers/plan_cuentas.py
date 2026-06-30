from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.plan_cuentas import PlanCuenta

router = APIRouter(
    prefix="/plan-cuentas",
    tags=["Plan de Cuentas"],
    dependencies=[Depends(get_current_user)],
)


class PlanCuentaOut(BaseModel):
    id: int
    codigo: str
    nombre: str
    tipo: str
    nivel: str
    nota: Optional[str] = None
    activa: bool

    class Config:
        from_attributes = True


@router.get("", response_model=List[PlanCuentaOut])
async def listar(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PlanCuenta).where(PlanCuenta.activa == True).order_by(PlanCuenta.codigo))
    return result.scalars().all()
