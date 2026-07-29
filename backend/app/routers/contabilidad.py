"""
Caverco ERP — Router Contabilidad
Importación y consulta del Registro de Compras y Ventas (SII) por empresa.

La importación corre como job asíncrono en background porque el scraping
al SII puede tardar más que el timeout HTTP del servidor (Render free ~30s).
"""
import csv
import io
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
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
    monto_impuesto_especifico: float = 0
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
    await db.flush()

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
        import re as _re

        def _periodo_desde_nombre(nombre: str) -> str | None:
            """Extrae YYYYMM del nombre del archivo SII, p.ej. RCV_COMPRA_REGISTRO_77868358-K_202501.csv → '202501'."""
            m = _re.search(r'(\d{6})(?:\.\w+)?$', nombre or '')
            return m.group(1) if m else None

        documentos_por_periodo: dict[str, list[dict]] = {}
        for archivo in archivos:
            periodo_archivo = _periodo_desde_nombre(archivo.filename)
            if not periodo_archivo:
                raise HTTPException(
                    400,
                    f"No se puede determinar el período del archivo '{archivo.filename}'. "
                    f"El nombre debe terminar en YYYYMM, p.ej. RCV_COMPRA_REGISTRO_77868358-K_202501.csv"
                )

            raw = await archivo.read()
            try:
                contenido = raw.decode("utf-8-sig")
            except UnicodeDecodeError:
                contenido = raw.decode("cp1252", errors="replace")

            filas = contenido.splitlines()
            docs_archivo = [
                d for d in parse_detalle_csv(filas, operacion)
                if any(d.get(f) for f in ("monto_total", "monto_neto", "monto_iva", "monto_exento"))
            ]

            if not docs_archivo:
                raise HTTPException(
                    400,
                    f"El archivo '{archivo.filename}' no contiene documentos válidos o su formato no es compatible. "
                    f"Descarga el CSV de detalle desde Registro de Compras y Ventas del SII (no el resumen)."
                )

            documentos_por_periodo.setdefault(periodo_archivo, []).extend(docs_archivo)

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


# ── Libro de Compras / Libro de Ventas ──────────────────────────────────────
# Reporte tributario mensual, espejo de lo cargado desde el RCV del SII:
# detalle documento a documento + resumen por tipo de documento + totales.

class ResumenTipoDocOut(BaseModel):
    tipo_doc: Optional[str] = None
    tipo_doc_nombre: Optional[str] = None
    cantidad: int
    monto_exento: Decimal
    monto_neto: Decimal
    monto_iva: Decimal
    monto_total: Decimal


class TotalesOut(BaseModel):
    cantidad: int
    monto_exento: Decimal
    monto_neto: Decimal
    monto_iva: Decimal
    monto_total: Decimal


class LibroOut(BaseModel):
    periodo: str
    operacion: str
    documentos: List[RcvDocumentoOut]
    resumen_por_tipo_doc: List[ResumenTipoDocOut]
    totales: TotalesOut


async def _libro(db: AsyncSession, id_empresa: int, periodo: str, operacion: str):
    operacion = operacion.upper()
    if operacion not in ("COMPRA", "VENTA"):
        raise HTTPException(400, "operacion debe ser COMPRA o VENTA")

    documentos = (await db.execute(
        select(RcvDocumento)
        .where(RcvDocumento.id_empresa == id_empresa, RcvDocumento.periodo == periodo,
               RcvDocumento.operacion == operacion)
        .order_by(RcvDocumento.fecha_docto, RcvDocumento.folio)
    )).scalars().all()

    resumen_rows = (await db.execute(
        select(
            RcvDocumento.tipo_doc, RcvDocumento.tipo_doc_nombre,
            func.count(RcvDocumento.id),
            func.coalesce(func.sum(RcvDocumento.monto_exento), 0),
            func.coalesce(func.sum(RcvDocumento.monto_neto), 0),
            func.coalesce(func.sum(RcvDocumento.monto_iva), 0),
            func.coalesce(func.sum(RcvDocumento.monto_total), 0),
        )
        .where(RcvDocumento.id_empresa == id_empresa, RcvDocumento.periodo == periodo,
               RcvDocumento.operacion == operacion)
        .group_by(RcvDocumento.tipo_doc, RcvDocumento.tipo_doc_nombre)
        .order_by(RcvDocumento.tipo_doc)
    )).all()

    resumen = [
        ResumenTipoDocOut(tipo_doc=r[0], tipo_doc_nombre=r[1], cantidad=r[2],
                          monto_exento=r[3], monto_neto=r[4], monto_iva=r[5], monto_total=r[6])
        for r in resumen_rows
    ]
    totales = TotalesOut(
        cantidad=sum(r.cantidad for r in resumen),
        monto_exento=sum((r.monto_exento for r in resumen), Decimal("0")),
        monto_neto=sum((r.monto_neto for r in resumen), Decimal("0")),
        monto_iva=sum((r.monto_iva for r in resumen), Decimal("0")),
        monto_total=sum((r.monto_total for r in resumen), Decimal("0")),
    )
    return documentos, resumen, totales


@router.get("/rcv/libro", response_model=LibroOut)
async def libro_compras_ventas(id_empresa: int, periodo: str, operacion: str, db: AsyncSession = Depends(get_db)):
    documentos, resumen, totales = await _libro(db, id_empresa, periodo, operacion.upper())
    return LibroOut(periodo=periodo, operacion=operacion.upper(),
                     documentos=documentos, resumen_por_tipo_doc=resumen, totales=totales)


@router.get("/rcv/libro/export")
async def exportar_libro_compras_ventas(id_empresa: int, periodo: str, operacion: str, db: AsyncSession = Depends(get_db)):
    documentos, resumen, totales = await _libro(db, id_empresa, periodo, operacion.upper())

    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";")
    w.writerow(["Tipo Doc", "Nombre Tipo Doc", "Folio", "Fecha Emisión", "Fecha Recepción",
                "RUT", "Razón Social", "Exento", "Neto", "IVA", "Impuesto Específico", "Total"])
    for d in documentos:
        w.writerow([
            d.tipo_doc or "", d.tipo_doc_nombre or "", d.folio or "",
            d.fecha_docto.isoformat() if d.fecha_docto else "",
            d.fecha_recepcion.isoformat() if d.fecha_recepcion else "",
            d.rut_contraparte or "", d.razon_social or "",
            d.monto_exento, d.monto_neto, d.monto_iva, d.monto_impuesto_especifico, d.monto_total,
        ])
    w.writerow([])
    w.writerow(["Resumen por Tipo de Documento"])
    w.writerow(["Tipo Doc", "Nombre Tipo Doc", "Cantidad", "Exento", "Neto", "IVA", "Total"])
    for r in resumen:
        w.writerow([r.tipo_doc or "", r.tipo_doc_nombre or "", r.cantidad,
                    r.monto_exento, r.monto_neto, r.monto_iva, r.monto_total])
    w.writerow(["TOTALES", "", totales.cantidad, totales.monto_exento, totales.monto_neto,
                totales.monto_iva, totales.monto_total])

    nombre = f"libro_{'compras' if operacion.upper() == 'COMPRA' else 'ventas'}_{periodo}.csv"
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )
