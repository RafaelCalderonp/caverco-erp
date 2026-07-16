from sqlalchemy import Column, Integer, String, Text, Numeric, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class AsientoContable(Base):
    __tablename__ = "asientos_contables"
    __table_args__ = {"schema": "erp"}

    id         = Column(Integer, primary_key=True)
    id_empresa = Column(Integer, nullable=False)
    numero     = Column(String(20), nullable=False)   # ej: 2025-0001
    tipo       = Column(String(30), nullable=False)   # VENTAS|COMPRAS|RRHH|BANCO|AJUSTE|APERTURA|CIERRE
    fecha      = Column(Date, nullable=False)
    periodo    = Column(String(6), nullable=False)    # YYYYMM
    glosa      = Column(Text)
    estado     = Column(String(20), nullable=False, default="BORRADOR")  # BORRADOR|CONTABILIZADO
    created_at = Column(DateTime, default=func.now())

    lineas = relationship("AsientoLinea", back_populates="asiento", cascade="all, delete-orphan", order_by="AsientoLinea.linea")


class AsientoLinea(Base):
    __tablename__ = "asiento_lineas"
    __table_args__ = {"schema": "erp"}

    id              = Column(Integer, primary_key=True)
    id_asiento      = Column(Integer, ForeignKey("erp.asientos_contables.id", ondelete="CASCADE"), nullable=False)
    linea           = Column(Integer, nullable=False)
    id_cuenta       = Column(Integer, ForeignKey("erp.plan_cuentas.id"), nullable=False)
    analisis        = Column(String(100))
    referencia      = Column(String(100))
    glosa_detalle   = Column(Text)
    debe            = Column(Numeric(14, 2), nullable=False, default=0)
    haber           = Column(Numeric(14, 2), nullable=False, default=0)

    asiento = relationship("AsientoContable", back_populates="lineas")
    cuenta  = relationship("PlanCuenta")
