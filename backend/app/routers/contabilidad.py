"""
Caverco ERP — Router Contabilidad
Importación y consulta del Registro de Compras y Ventas (SII) por empresa.

La importación corre como job asíncrono en background porque el scraping
al SII puede tardar más que el timeout HTTP del servidor (Render free ~30s).
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import date, datetime

from app.core.database import get_db, AsyncSessionLocal
from app.core.security import get_current_user, require_roles
from app.core.crypto import decrypt
from app.models.rrhh import EmpresaCredencial
from app.models.contabilidad import RcvDocumento, RcvImportacion, RcvImportJob
from app.services.sii_rcv import importar_rcv_multi, periodos_entre, parse_detalle_csv

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
    periodo: str  # YYYYMM (desde, si se indica periodo_hasta)
    periodo_hasta: Optional[str] = None  # YYYYMM, opcional, para importar un rango de meses
    operacion: str  # COMPRA | VENTA


class ImportarPeriodoOut(BaseModel):
    periodo: str
    operacion: str
    total_docs: int
    monto_total: float


class JobOut(BaseModel):
    id: int
    estado: str
    resultado: Optional[Any] = None
    error: Optional[str] = None

    class Config:
        from_attributes = True


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


async def _guardar_documentos(db: AsyncSession, id_empresa: int, periodo: str, operacion: str,
                               documentos: list[dict]) -> dict:
    await db.execute(
        delete(RcvDocumento).where(
            RcvDocumento.id_empresa == id_empresa,
            RcvDocumento.periodo == periodo,
            RcvDocumento.operacion == operacion,
        )
    )
    monto_total = 0
    for doc in documentos:
        db.add(RcvDocumento(id_empresa=id_empresa, periodo=periodo, operacion=operacion, **doc))
        monto_total += doc.get("monto_total") or 0

    imp_result = await db.execute(
        select(RcvImportacion).where(
            RcvImportacion.id_empresa == id_empresa,
            RcvImportacion.periodo == periodo,
            RcvImportacion.operacion == operacion,
        )
    )
    imp = imp_result.scalar_one_or_none()
    if imp:
        imp.total_docs = len(documentos)
        imp.monto_total = monto_total
    else:
        db.add(RcvImportacion(
            id_empresa=id_empresa, periodo=periodo, operacion=operacion,
            total_docs=len(documentos), monto_total=monto_total,
        ))

    return {"periodo": periodo, "operacion": operacion, "total_docs": len(documentos), "monto_total": monto_total}


async def _ejecutar_import_job(job_id: int, id_empresa: int, usuario: str, password_cifrada: str,
                                periodos: list[str], operacion: str):
    async with AsyncSessionLocal() as db:
        job = await db.get(RcvImportJob, job_id)
        try:
            documentos_por_periodo = await importar_rcv_multi(usuario, decrypt(password_cifrada), periodos, operacion)

            resultados = []
            for periodo in periodos:
                documentos = documentos_por_periodo[periodo]
                resultados.append(await _guardar_documentos(db, id_empresa, periodo, operacion, documentos))

            job.estado = "OK"
            job.resultado = {"resultados": resultados}
            job.updated_at = datetime.utcnow()
            await db.commit()
        except Exception as exc:
            await db.rollback()
            job = await db.get(RcvImportJob, job_id)
            job.estado = "ERROR"
            job.error = str(exc)
            job.updated_at = datetime.utcnow()
            await db.commit()


@router.post(
    "/rcv/importar",
    response_model=JobOut,
    dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))],
)
async def importar(id_empresa: int, data: ImportarIn, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
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

    periodos = periodos_entre(data.periodo, data.periodo_hasta) if data.periodo_hasta else [data.periodo]
    if len(periodos) > 24:
        raise HTTPException(400, "El rango de períodos no puede superar los 24 meses")

    job = RcvImportJob(
        id_empresa=id_empresa, periodo=data.periodo, periodo_hasta=data.periodo_hasta,
        operacion=operacion, estado="PENDIENTE",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(
        _ejecutar_import_job, job.id, id_empresa, cred.usuario, cred.password_cifrada, periodos, operacion
    )

    return job


@router.get("/rcv/importar/{job_id}", response_model=JobOut)
async def estado_import(id_empresa: int, job_id: int, db: AsyncSession = Depends(get_db)):
    job = await db.get(RcvImportJob, job_id)
    if not job or job.id_empresa != id_empresa:
        raise HTTPException(404, "Job no encontrado")
    return job


@router.post(
    "/rcv/cargar-archivo",
    response_model=List[ImportarPeriodoOut],
    dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))],
)
async def cargar_archivo(
    id_empresa: int,
    operacion: str = Form(...),
    archivos: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Carga uno o varios archivos CSV del RCV exportados manualmente desde el SII.
    Cada documento se asigna a su período (YYYYMM) según su fecha de emisión, por lo
    que se pueden subir varios archivos de meses distintos (p.ej. los 12 de un año) en
    una sola operación, sin importar cómo vengan agrupados los archivos."""
    operacion = operacion.upper()
    if operacion not in ("COMPRA", "VENTA"):
        raise HTTPException(400, "operacion debe ser COMPRA o VENTA")

    try:
        documentos_por_periodo: dict[str, list[dict]] = {}
        for archivo in archivos:
            raw = await archivo.read()
            # Los CSV del SII se exportan en Windows-1252; intentamos UTF-8 primero con BOM
            try:
                contenido = raw.decode("utf-8-sig")
            except UnicodeDecodeError:
                contenido = raw.decode("cp1252", errors="replace")

            filas = contenido.splitlines()
            docs_archivo = parse_detalle_csv(filas, operacion)

            if not docs_archivo:
                raise HTTPException(
                    400,
                    f"El archivo '{archivo.filename}' no contiene documentos válidos o su formato no es compatible. "
                    f"Descarga el CSV de detalle desde Registro de Compras y Ventas del SII (no el resumen)."
                )

            sin_fecha = 0
            for doc in docs_archivo:
                if not doc.get("fecha_docto"):
                    sin_fecha += 1
                    continue
                periodo = doc["fecha_docto"].strftime("%Y%m")
                documentos_por_periodo.setdefault(periodo, []).append(doc)

            if sin_fecha == len(docs_archivo):
                raise HTTPException(
                    400,
                    f"El archivo '{archivo.filename}' no tiene fechas legibles. "
                    f"Verifica que sea el CSV de detalle del RCV (no el resumen)."
                )

        if not documentos_por_periodo:
            raise HTTPException(400, "Los archivos no contienen documentos válidos con fecha de emisión.")

        resultados = []
        for periodo, documentos in documentos_por_periodo.items():
            resultados.append(await _guardar_documentos(db, id_empresa, periodo, operacion, documentos))
        await db.commit()
        return resultados

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Error procesando archivos: {exc}") from exc
