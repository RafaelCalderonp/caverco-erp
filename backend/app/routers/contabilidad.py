"""
Caverco ERP — Router Contabilidad
Importación y consulta del Registro de Compras y Ventas (SII) por empresa.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.core.crypto import decrypt
from app.models.rrhh import EmpresaCredencial
from app.models.contabilidad import RcvDocumento, RcvImportacion
from app.services.sii_rcv import importar_rcv

router = APIRouter(
    prefix="/empresas/{id_empresa}/contabilidad",
    tags=["Contabilidad"],
    dependencies=[Depends(get_current_user)],
)


class RcvDocumentoOut(BaseModel):
    tipo_doc: Optional[str] = None
    tipo_doc_nombre: Optional[str] = None
    rut_contraparte: Optional[str] = None
    razon_social: Optional[str] = None
    folio: Optional[str] = None
    fecha_docto: Optional[date] = None
    fecha_recepcion: Optional[date] = None
    monto_exento: float = 0
    monto_neto: float = 0
    monto_iva: float = 0
    monto_total: float = 0

    class Config:
        from_attributes = True


class ImportarIn(BaseModel):
    periodo: str  # YYYYMM
    operacion: str  # COMPRA | VENTA


class ImportarOut(BaseModel):
    periodo: str
    operacion: str
    total_docs: int
    monto_total: float


@router.get("/rcv", response_model=List[RcvDocumentoOut])
async def listar_rcv(id_empresa: int, periodo: str, operacion: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RcvDocumento).where(
            RcvDocumento.id_empresa == id_empresa,
            RcvDocumento.periodo == periodo,
            RcvDocumento.operacion == operacion.upper(),
        )
    )
    return result.scalars().all()


@router.post(
    "/rcv/importar",
    response_model=ImportarOut,
    dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))],
)
async def importar(id_empresa: int, data: ImportarIn, db: AsyncSession = Depends(get_db)):
    operacion = data.operacion.upper()
    if operacion not in ("COMPRA", "VENTA"):
        raise HTTPException(400, "operacion debe ser COMPRA o VENTA")

    cred_result = await db.execute(
        select(EmpresaCredencial).where(
            EmpresaCredencial.id_empresa == id_empresa, EmpresaCredencial.tipo == "SII"
        )
    )
    cred = cred_result.scalar_one_or_none()
    if not cred:
        raise HTTPException(400, "No hay credencial SII configurada para esta empresa")

    try:
        documentos = await importar_rcv(cred.usuario, decrypt(cred.password_cifrada), data.periodo, operacion)
    except Exception as exc:
        raise HTTPException(502, f"Error al importar desde el SII: {exc}")

    await db.execute(
        delete(RcvDocumento).where(
            RcvDocumento.id_empresa == id_empresa,
            RcvDocumento.periodo == data.periodo,
            RcvDocumento.operacion == operacion,
        )
    )
    monto_total = 0
    for doc in documentos:
        db.add(RcvDocumento(id_empresa=id_empresa, periodo=data.periodo, operacion=operacion, **doc))
        monto_total += doc.get("monto_total") or 0

    imp_result = await db.execute(
        select(RcvImportacion).where(
            RcvImportacion.id_empresa == id_empresa,
            RcvImportacion.periodo == data.periodo,
            RcvImportacion.operacion == operacion,
        )
    )
    imp = imp_result.scalar_one_or_none()
    if imp:
        imp.total_docs = len(documentos)
        imp.monto_total = monto_total
    else:
        db.add(RcvImportacion(
            id_empresa=id_empresa, periodo=data.periodo, operacion=operacion,
            total_docs=len(documentos), monto_total=monto_total,
        ))

    return ImportarOut(periodo=data.periodo, operacion=operacion, total_docs=len(documentos), monto_total=monto_total)
