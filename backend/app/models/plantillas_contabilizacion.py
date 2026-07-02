from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class PlantillaContabilizacion(Base):
    __tablename__ = "plantillas_contabilizacion"
    __table_args__ = {"schema": "erp"}

    id              = Column(Integer, primary_key=True)
    id_empresa      = Column(Integer, nullable=False)
    rut             = Column(String(20), nullable=False)
    nombre          = Column(String(150))
    tipo            = Column(String(20), nullable=False)   # PROVEEDOR | CLIENTE
    id_cuenta_debe  = Column(Integer, ForeignKey("erp.plan_cuentas.id"), nullable=False)
    id_cuenta_haber = Column(Integer, ForeignKey("erp.plan_cuentas.id"), nullable=False)
    activa          = Column(Boolean, default=True, nullable=False)

    cuenta_debe  = relationship("PlanCuenta", foreign_keys=[id_cuenta_debe])
    cuenta_haber = relationship("PlanCuenta", foreign_keys=[id_cuenta_haber])
