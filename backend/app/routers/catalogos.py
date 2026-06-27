from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.rrhh import TipoContrato, MotivoTermino, TipoAnexo, Obra, Cargo, CentroCosto, AFP, Isapre
from app.schemas.rrhh import (
    CargoCreate, CargoUpdate, CargoOut,
    CentroCostoCreate, CentroCostoUpdate, CentroCostoOut,
    ObraCreate, ObraUpdate, ObraOut,
)
from app.services.correlativos import siguiente_codigo

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


@router.get("/obras", response_model=List[ObraOut])
async def listar_obras(id_empresa: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(Obra).where(Obra.activa == True)
    if id_empresa:
        q = q.where(Obra.id_empresa == id_empresa)
    result = await db.execute(q.order_by(Obra.nombre))
    return result.scalars().all()


@router.post("/obras", response_model=ObraOut, status_code=201)
async def crear_obra(data: ObraCreate, db: AsyncSession = Depends(get_db)):
    codigo = await siguiente_codigo(db, data.id_empresa, "OBR")
    obra = Obra(**data.model_dump(), codigo=codigo)
    db.add(obra)
    await db.flush()
    await db.refresh(obra)
    return obra


@router.patch("/obras/{id}", response_model=ObraOut)
async def actualizar_obra(id: int, data: ObraUpdate, db: AsyncSession = Depends(get_db)):
    obra = await db.get(Obra, id)
    if not obra:
        raise HTTPException(status_code=404, detail="Obra no encontrada")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obra, k, v)
    return obra


@router.delete("/obras/{id}", status_code=204)
async def eliminar_obra(id: int, db: AsyncSession = Depends(get_db)):
    obra = await db.get(Obra, id)
    if not obra:
        raise HTTPException(status_code=404, detail="Obra no encontrada")
    try:
        await db.delete(obra)
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="No se puede eliminar: la obra está en uso por algún contrato o trabajador")


@router.get("/cargos", response_model=List[CargoOut])
async def listar_cargos(id_empresa: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(Cargo).where(Cargo.activo == True)
    if id_empresa:
        q = q.where(Cargo.id_empresa == id_empresa)
    result = await db.execute(q.order_by(Cargo.nombre))
    return result.scalars().all()


@router.post("/cargos", response_model=CargoOut, status_code=201)
async def crear_cargo(data: CargoCreate, db: AsyncSession = Depends(get_db)):
    codigo = await siguiente_codigo(db, data.id_empresa, "CAR")
    cargo = Cargo(**data.model_dump(), codigo=codigo)
    db.add(cargo)
    await db.flush()
    await db.refresh(cargo)
    return cargo


@router.patch("/cargos/{id}", response_model=CargoOut)
async def actualizar_cargo(id: int, data: CargoUpdate, db: AsyncSession = Depends(get_db)):
    cargo = await db.get(Cargo, id)
    if not cargo:
        raise HTTPException(status_code=404, detail="Cargo no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(cargo, k, v)
    return cargo


@router.delete("/cargos/{id}", status_code=204)
async def eliminar_cargo(id: int, db: AsyncSession = Depends(get_db)):
    cargo = await db.get(Cargo, id)
    if not cargo:
        raise HTTPException(status_code=404, detail="Cargo no encontrado")
    try:
        await db.delete(cargo)
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="No se puede eliminar: el cargo está en uso por algún trabajador o contrato")


@router.get("/centros-costo", response_model=List[CentroCostoOut])
async def listar_centros_costo(id_empresa: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(CentroCosto).where(CentroCosto.activo == True)
    if id_empresa:
        q = q.where(CentroCosto.id_empresa == id_empresa)
    result = await db.execute(q.order_by(CentroCosto.nombre))
    return result.scalars().all()


@router.post("/centros-costo", response_model=CentroCostoOut, status_code=201)
async def crear_centro_costo(data: CentroCostoCreate, db: AsyncSession = Depends(get_db)):
    centro = CentroCosto(**data.model_dump())
    db.add(centro)
    await db.flush()
    await db.refresh(centro)
    return centro


@router.patch("/centros-costo/{id}", response_model=CentroCostoOut)
async def actualizar_centro_costo(id: int, data: CentroCostoUpdate, db: AsyncSession = Depends(get_db)):
    centro = await db.get(CentroCosto, id)
    if not centro:
        raise HTTPException(status_code=404, detail="Centro de costo no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(centro, k, v)
    return centro


@router.delete("/centros-costo/{id}", status_code=204)
async def eliminar_centro_costo(id: int, db: AsyncSession = Depends(get_db)):
    centro = await db.get(CentroCosto, id)
    if not centro:
        raise HTTPException(status_code=404, detail="Centro de costo no encontrado")
    try:
        await db.delete(centro)
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="No se puede eliminar: el centro de costo está en uso por algún trabajador o contrato")


@router.get("/afp")
async def listar_afp(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AFP).where(AFP.activa == True))
    return [{"id": a.id, "nombre": a.nombre, "tasa": a.tasa} for a in result.scalars().all()]


@router.get("/isapre")
async def listar_isapre(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Isapre).where(Isapre.activa == True))
    return [{"id": i.id, "nombre": i.nombre, "es_fonasa": i.es_fonasa} for i in result.scalars().all()]
