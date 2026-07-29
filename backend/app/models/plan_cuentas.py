from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, PrimaryKeyConstraint
from app.core.database import Base


class PlanCuenta(Base):
    __tablename__ = "plan_cuentas"
    __table_args__ = {"schema": "erp"}

    id          = Column(Integer, primary_key=True)
    codigo      = Column(String(20), nullable=False)
    nombre      = Column(String(150), nullable=False)
    tipo        = Column(String(20), nullable=False)   # ACTIVO|PASIVO|PATRIMONIO|INGRESO|EGRESO
    nivel       = Column(String(1), nullable=False)    # A=agrupadora D=detalle
    nota        = Column(Text)
    activa      = Column(Boolean, default=True, nullable=False)
    # NULL = cuenta del catálogo base (compartida); valor = cuenta propia de esa empresa
    id_empresa  = Column(Integer, ForeignKey("erp.empresas.id", ondelete="CASCADE"))


class EmpresaPlanCuentaEstado(Base):
    """Override por empresa de la activación de una cuenta del catálogo base."""
    __tablename__ = "empresa_plan_cuentas_estado"
    __table_args__ = (
        PrimaryKeyConstraint("id_empresa", "id_cuenta"),
        {"schema": "erp"},
    )

    id_empresa = Column(Integer, ForeignKey("erp.empresas.id", ondelete="CASCADE"), nullable=False)
    id_cuenta  = Column(Integer, ForeignKey("erp.plan_cuentas.id", ondelete="CASCADE"), nullable=False)
    activa     = Column(Boolean, nullable=False)
