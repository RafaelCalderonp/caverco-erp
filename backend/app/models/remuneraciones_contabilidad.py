from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, PrimaryKeyConstraint, CheckConstraint, func
from app.core.database import Base


class PlantillaAsientoRemuneraciones(Base):
    """Mapeo por empresa de conceptos de remuneraciones -> cuentas del plan de cuentas."""
    __tablename__ = "plantilla_asiento_remuneraciones"
    __table_args__ = {"schema": "erp"}

    id_empresa = Column(Integer, ForeignKey("erp.empresas.id", ondelete="CASCADE"), primary_key=True)

    id_cuenta_gasto_remuneraciones          = Column(Integer, ForeignKey("erp.plan_cuentas.id"))
    id_cuenta_gasto_colacion_movilizacion   = Column(Integer, ForeignKey("erp.plan_cuentas.id"))
    id_cuenta_gasto_cotizaciones_patronales = Column(Integer, ForeignKey("erp.plan_cuentas.id"))

    id_cuenta_prevision_por_pagar      = Column(Integer, ForeignKey("erp.plan_cuentas.id"))
    id_cuenta_cesantia_por_pagar       = Column(Integer, ForeignKey("erp.plan_cuentas.id"))
    id_cuenta_salud_por_pagar          = Column(Integer, ForeignKey("erp.plan_cuentas.id"))
    id_cuenta_impuesto_unico_por_pagar = Column(Integer, ForeignKey("erp.plan_cuentas.id"))
    id_cuenta_anticipos_prestamos      = Column(Integer, ForeignKey("erp.plan_cuentas.id"))
    id_cuenta_remuneraciones_por_pagar = Column(Integer, ForeignKey("erp.plan_cuentas.id"))

    id_cuenta_banco = Column(Integer, ForeignKey("erp.plan_cuentas.id"))


class RemuneracionesAsiento(Base):
    """Registro de qué asiento (provisión/pago) se generó para cada período, evita duplicados."""
    __tablename__ = "remuneraciones_asientos"
    __table_args__ = (
        PrimaryKeyConstraint("id_empresa", "periodo", "tipo"),
        CheckConstraint("tipo IN ('PROVISION', 'PAGO')", name="chk_remuneraciones_asientos_tipo"),
        {"schema": "erp"},
    )

    id_empresa = Column(Integer, ForeignKey("erp.empresas.id", ondelete="CASCADE"), nullable=False)
    periodo    = Column(String(7), nullable=False)
    tipo       = Column(String(10), nullable=False)
    id_asiento = Column(Integer, ForeignKey("erp.asientos_contables.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
