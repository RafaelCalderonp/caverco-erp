from sqlalchemy import Column, Integer, String, Numeric, Date, Text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import TIMESTAMP, JSONB

TIMESTAMPTZ = TIMESTAMP(timezone=True)
from sqlalchemy.sql import func
from app.core.database import Base


class RcvImportacion(Base):
    """Registro de cada importación de Registro de Compras y Ventas (SII) por empresa/período/operación."""
    __tablename__ = "rcv_importaciones"
    __table_args__ = (
        UniqueConstraint("id_empresa", "periodo", "operacion", name="uq_rcv_importacion_periodo"),
        {"schema": "erp"},
    )

    id           = Column(Integer, primary_key=True)
    id_empresa   = Column(Integer, ForeignKey("erp.empresas.id"), nullable=False)
    periodo      = Column(String(6), nullable=False)   # YYYYMM
    operacion    = Column(String(10), nullable=False)  # COMPRA | VENTA
    total_docs   = Column(Integer, default=0)
    monto_total  = Column(Numeric(14, 2), default=0)
    created_at   = Column(TIMESTAMPTZ, server_default=func.now())


class RcvDocumento(Base):
    """Línea de detalle de un documento del Registro de Compras y Ventas (SII), importada vía scraping propio."""
    __tablename__ = "rcv_documentos"
    __table_args__ = {"schema": "erp"}

    id                = Column(Integer, primary_key=True)
    id_empresa        = Column(Integer, ForeignKey("erp.empresas.id"), nullable=False)
    periodo           = Column(String(6), nullable=False)   # YYYYMM
    operacion         = Column(String(10), nullable=False)  # COMPRA | VENTA
    tipo_doc          = Column(String(4))                   # código SII (33, 61, etc.)
    tipo_doc_nombre   = Column(String(80))
    rut_contraparte   = Column(String(15))
    razon_social      = Column(String(150))
    folio             = Column(String(20))
    fecha_docto       = Column(Date)
    fecha_recepcion   = Column(Date)
    monto_exento      = Column(Numeric(14, 2), default=0)
    monto_neto        = Column(Numeric(14, 2), default=0)
    monto_iva         = Column(Numeric(14, 2), default=0)
    monto_total       = Column(Numeric(14, 2), default=0)
    created_at        = Column(TIMESTAMPTZ, server_default=func.now())


class RcvImportJob(Base):
    """Job asíncrono de importación RCV (el scraping al SII puede tardar más que el
    timeout HTTP del servidor, por lo que se ejecuta en background y se consulta su estado)."""
    __tablename__ = "rcv_import_jobs"
    __table_args__ = {"schema": "erp"}

    id            = Column(Integer, primary_key=True)
    id_empresa    = Column(Integer, ForeignKey("erp.empresas.id"), nullable=False)
    periodo       = Column(String(6), nullable=False)
    periodo_hasta = Column(String(6))
    operacion     = Column(String(10), nullable=False)
    estado        = Column(String(15), nullable=False, default="PENDIENTE")  # PENDIENTE | OK | ERROR
    resultado     = Column(JSONB)
    error         = Column(Text)
    created_at    = Column(TIMESTAMPTZ, server_default=func.now())
    updated_at    = Column(TIMESTAMPTZ, server_default=func.now(), onupdate=func.now())
