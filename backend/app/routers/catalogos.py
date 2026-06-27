from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.rrhh import TipoContrato, MotivoTermino, TipoAnexo, Obra, Cargo, CentroCosto, AFP, Isapre

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
async def listar_obras(id_empresa: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(Obra).where(Obra.activa == True)
    if id_empresa:
        q = q.where(Obra.id_empresa == id_empresa)
    result = await db.execute(q)
    return [{"id": o.id, "codigo": o.codigo, "nombre": o.nombre} for o in result.scalars().all()]


@router.get("/cargos")
async def listar_cargos(id_empresa: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(Cargo).where(Cargo.activo == True)
    if id_empresa:
        q = q.where(Cargo.id_empresa == id_empresa)
    result = await db.execute(q)
    return [{"id": c.id, "codigo": c.codigo, "nombre": c.nombre} for c in result.scalars().all()]


@router.get("/centros-costo")
async def listar_centros_costo(id_empresa: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(CentroCosto).where(CentroCosto.activo == True)
    if id_empresa:
        q = q.where(CentroCosto.id_empresa == id_empresa)
    result = await db.execute(q)
    return [{"id": c.id, "codigo": c.codigo, "nombre": c.nombre} for c in result.scalars().all()]


@router.get("/afp")
async def listar_afp(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AFP).where(AFP.activa == True))
    return [{"id": a.id, "nombre": a.nombre, "tasa": a.tasa} for a in result.scalars().all()]


@router.get("/isapre")
async def listar_isapre(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Isapre).where(Isapre.activa == True))
    return [{"id": i.id, "nombre": i.nombre, "es_fonasa": i.es_fonasa} for i in result.scalars().all()]
