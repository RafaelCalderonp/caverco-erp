from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.rrhh import TipoContrato, MotivoTermino, TipoAnexo, Obra, Cargo, CentroCosto

router = APIRouter(prefix="/catalogos", tags=["Catálogos"], dependencies=[Depends(get_current_user)])


@router.get("/tipos-contrato")
async def listar_tipos_contrato(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TipoContrato))
    return [{"id": t.id, "codigo": t.codigo, "nombre": t.nombre} for t in result.scalars().all()]


@router.get("/motivos-termino")
async def listar_motivos_termino(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MotivoTermino))
    return [{"id": m.id, "codigo": m.codigo, "nombre": m.nombre, "articulo_ct": m.articulo_ct} for m in result.scalars().all()]


@router.get("/tipos-anexo")
async def listar_tipos_anexo(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TipoAnexo))
    return [{"id": t.id, "codigo": t.codigo, "nombre": t.nombre} for t in result.scalars().all()]


@router.get("/obras")
async def listar_obras(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Obra).where(Obra.activa == True))
    return [{"id": o.id, "codigo": o.codigo, "nombre": o.nombre} for o in result.scalars().all()]


@router.get("/cargos")
async def listar_cargos(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Cargo).where(Cargo.activo == True))
    return [{"id": c.id, "codigo": c.codigo, "nombre": c.nombre} for c in result.scalars().all()]


@router.get("/centros-costo")
async def listar_centros_costo(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CentroCosto).where(CentroCosto.activo == True))
    return [{"id": c.id, "codigo": c.codigo, "nombre": c.nombre} for c in result.scalars().all()]
