from sqlalchemy import Column, Integer, String, Text, Boolean
from app.core.database import Base


class PlanCuenta(Base):
    __tablename__ = "plan_cuentas"
    __table_args__ = {"schema": "erp"}

    id          = Column(Integer, primary_key=True)
    codigo      = Column(String(20), nullable=False, unique=True)
    nombre      = Column(String(150), nullable=False)
    tipo        = Column(String(20), nullable=False)   # ACTIVO|PASIVO|PATRIMONIO|INGRESO|EGRESO
    nivel       = Column(String(1), nullable=False)    # A=agrupadora D=detalle
    nota        = Column(Text)
    activa      = Column(Boolean, default=True, nullable=False)
