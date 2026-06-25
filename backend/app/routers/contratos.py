from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.rrhh import (
    Contrato, AnexoContrato, ContratoDocumento, ContratoRequisitoObra,
    EntregaEpp, PactoHorasExtra,
)
from app.schemas.rrhh import (
    ContratoCreate, ContratoUpdate, ContratoOut,
    AnexoContratoCreate, AnexoContratoOut,
    ContratoDocumentoCreate, ContratoDocumentoOut,
    ContratoRequisitoObraCreate, ContratoRequisitoObraUpdate, ContratoRequisitoObraOut,
    EntregaEppCreate, EntregaEppOut,
    PactoHorasExtraCreate, PactoHorasExtraOut,
)

router = APIRouter(prefix="/contratos", tags=["Contratos"], dependencies=[Depends(get_current_user)])


async def _get_contrato_or_404(id: int, db: AsyncSession) -> Contrato:
    result = await db.execute(
        select(Contrato)
        .options(
            selectinload(Contrato.anexos),
            selectinload(Contrato.documentos),
            selectinload(Contrato.requisitos_obra),
        )
        .where(Contrato.id == id)
    )
    contrato = result.scalar_one_or_none()
    if contrato is None:
        raise HTTPException(404, "Contrato no encontrado")
    return contrato


@router.get("", response_model=List[ContratoOut])
async def listar_contratos(
    id_empleado: Optional[int] = None,
    estado: Optional[str] = None,
    id_obra: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Contrato)
    if id_empleado is not None:
        query = query.where(Contrato.id_empleado == id_empleado)
    if estado is not None:
        query = query.where(Contrato.estado == estado)
    if id_obra is not None:
        query = query.where(Contrato.id_obra == id_obra)
    result = await db.execute(query.order_by(Contrato.fecha_inicio.desc()))
    return result.scalars().all()


@router.get("/{id}", response_model=ContratoOut)
async def obtener_contrato(id: int, db: AsyncSession = Depends(get_db)):
    return await _get_contrato_or_404(id, db)


@router.post("", response_model=ContratoOut, status_code=201,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def crear_contrato(data: ContratoCreate, db: AsyncSession = Depends(get_db)):
    contrato = Contrato(**data.model_dump())
    db.add(contrato)
    await db.commit()
    await db.refresh(contrato)
    return contrato


@router.patch("/{id}", response_model=ContratoOut,
              dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def actualizar_contrato(id: int, data: ContratoUpdate, db: AsyncSession = Depends(get_db)):
    contrato = await _get_contrato_or_404(id, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(contrato, field, value)
    await db.commit()
    await db.refresh(contrato)
    return contrato


@router.post("/{id}/finiquitar", response_model=ContratoOut,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def finiquitar_contrato(
    id: int,
    id_motivo_termino: int,
    fecha_termino_real: date,
    db: AsyncSession = Depends(get_db),
):
    contrato = await _get_contrato_or_404(id, db)
    if contrato.estado != "vigente":
        raise HTTPException(400, "Solo se puede finiquitar un contrato vigente")
    contrato.estado = "finiquitado"
    contrato.id_motivo_termino = id_motivo_termino
    contrato.fecha_termino_real = fecha_termino_real
    await db.commit()
    await db.refresh(contrato)
    return contrato


# ---- Anexos ----
@router.get("/{id}/anexos", response_model=List[AnexoContratoOut])
async def listar_anexos(id: int, db: AsyncSession = Depends(get_db)):
    await _get_contrato_or_404(id, db)
    result = await db.execute(
        select(AnexoContrato).where(AnexoContrato.id_contrato == id).order_by(AnexoContrato.fecha_anexo.desc())
    )
    return result.scalars().all()


@router.post("/{id}/anexos", response_model=AnexoContratoOut, status_code=201,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def crear_anexo(id: int, data: AnexoContratoCreate, db: AsyncSession = Depends(get_db)):
    contrato = await _get_contrato_or_404(id, db)
    anexo = AnexoContrato(id_contrato=id, id_empleado=contrato.id_empleado, **data.model_dump())
    db.add(anexo)
    await db.commit()
    await db.refresh(anexo)
    return anexo


# ---- Documentos ----
@router.get("/{id}/documentos", response_model=List[ContratoDocumentoOut])
async def listar_documentos(id: int, db: AsyncSession = Depends(get_db)):
    await _get_contrato_or_404(id, db)
    result = await db.execute(select(ContratoDocumento).where(ContratoDocumento.id_contrato == id))
    return result.scalars().all()


@router.post("/{id}/documentos", response_model=ContratoDocumentoOut, status_code=201,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def crear_documento(id: int, data: ContratoDocumentoCreate, db: AsyncSession = Depends(get_db),
                           usuario=Depends(get_current_user)):
    await _get_contrato_or_404(id, db)
    documento = ContratoDocumento(id_contrato=id, id_usuario_carga=usuario.id, **data.model_dump())
    db.add(documento)
    await db.commit()
    await db.refresh(documento)
    return documento


# ---- Requisitos de ingreso a obra ----
@router.get("/{id}/requisitos-obra", response_model=List[ContratoRequisitoObraOut])
async def listar_requisitos_obra(id: int, db: AsyncSession = Depends(get_db)):
    await _get_contrato_or_404(id, db)
    result = await db.execute(select(ContratoRequisitoObra).where(ContratoRequisitoObra.id_contrato == id))
    return result.scalars().all()


@router.post("/{id}/requisitos-obra", response_model=ContratoRequisitoObraOut, status_code=201,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def crear_requisito_obra(id: int, data: ContratoRequisitoObraCreate, db: AsyncSession = Depends(get_db)):
    await _get_contrato_or_404(id, db)
    requisito = ContratoRequisitoObra(id_contrato=id, **data.model_dump())
    db.add(requisito)
    await db.commit()
    await db.refresh(requisito)
    return requisito


@router.patch("/requisitos-obra/{id}", response_model=ContratoRequisitoObraOut,
              dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def actualizar_requisito_obra(id: int, data: ContratoRequisitoObraUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ContratoRequisitoObra).where(ContratoRequisitoObra.id == id))
    requisito = result.scalar_one_or_none()
    if requisito is None:
        raise HTTPException(404, "Requisito de obra no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(requisito, field, value)
    await db.commit()
    await db.refresh(requisito)
    return requisito


# ---- Entrega de EPP ----
@router.get("/{id}/entregas-epp", response_model=List[EntregaEppOut])
async def listar_entregas_epp(id: int, db: AsyncSession = Depends(get_db)):
    await _get_contrato_or_404(id, db)
    result = await db.execute(select(EntregaEpp).where(EntregaEpp.id_contrato == id))
    return result.scalars().all()


@router.post("/{id}/entregas-epp", response_model=EntregaEppOut, status_code=201,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def crear_entrega_epp(id: int, data: EntregaEppCreate, db: AsyncSession = Depends(get_db)):
    await _get_contrato_or_404(id, db)
    entrega = EntregaEpp(id_contrato=id, **data.model_dump())
    db.add(entrega)
    await db.commit()
    await db.refresh(entrega)
    return entrega


# ---- Pactos de horas extra ----
@router.get("/{id}/pactos-horas-extra", response_model=List[PactoHorasExtraOut])
async def listar_pactos_horas_extra(id: int, db: AsyncSession = Depends(get_db)):
    await _get_contrato_or_404(id, db)
    result = await db.execute(select(PactoHorasExtra).where(PactoHorasExtra.id_contrato == id))
    return result.scalars().all()


@router.post("/{id}/pactos-horas-extra", response_model=PactoHorasExtraOut, status_code=201,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def crear_pacto_horas_extra(id: int, data: PactoHorasExtraCreate, db: AsyncSession = Depends(get_db)):
    await _get_contrato_or_404(id, db)
    pacto = PactoHorasExtra(id_contrato=id, **data.model_dump())
    db.add(pacto)
    await db.commit()
    await db.refresh(pacto)
    return pacto
