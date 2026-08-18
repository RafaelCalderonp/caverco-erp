from sqlalchemy import Column, Integer, String, Date, CHAR, Numeric, SmallInteger, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.sql import func
from app.core.database import Base

TIMESTAMPTZ = TIMESTAMP(timezone=True)


class SolicitudContrato(Base):
    """
    Enlace público ligado a una sola empresa para que un futuro trabajador
    complete sus datos personales desde afuera del sistema, sin poder ver ni
    cambiar la empresa. Desde el ERP esos datos precargan "Nuevo Contrato".
    """
    __tablename__ = "solicitudes_contrato"
    __table_args__ = (
        CheckConstraint("estado IN ('PENDIENTE', 'ENVIADA', 'CONVERTIDA')", name="chk_solicitudes_contrato_estado"),
        {"schema": "erp"},
    )

    id                = Column(Integer, primary_key=True)
    id_empresa        = Column(Integer, ForeignKey("erp.empresas.id", ondelete="CASCADE"), nullable=False)
    token             = Column(String(64), nullable=False, unique=True)
    nombre_referencia = Column(String(150))
    estado            = Column(String(20), nullable=False, default="PENDIENTE")

    rut               = Column(String(12))
    nombres           = Column(String(100))
    apellido_paterno  = Column(String(60))
    apellido_materno  = Column(String(60))
    fecha_nacimiento  = Column(Date)
    genero            = Column(CHAR(1))
    estado_civil      = Column(String(20))
    nacionalidad      = Column(String(50))
    direccion         = Column(String(200))
    comuna            = Column(String(80))
    region            = Column(String(80))
    ciudad            = Column(String(80))
    telefono          = Column(String(20))
    email_personal    = Column(String(120))
    id_afp            = Column(Integer, ForeignKey("erp.afp.id"))
    id_isapre         = Column(Integer, ForeignKey("erp.isapre.id"))
    valor_isapre_uf   = Column(Numeric(8, 4))
    n_cargas          = Column(SmallInteger)
    banco             = Column(String(60))
    tipo_cuenta       = Column(String(30))
    numero_cuenta     = Column(String(30))
    contacto_emergencia_nombre    = Column(String(120))
    contacto_emergencia_telefono  = Column(String(20))

    id_empleado_generado = Column(Integer, ForeignKey("erp.empleados.id"))

    created_at    = Column(TIMESTAMPTZ, server_default=func.now())
    enviado_at    = Column(TIMESTAMPTZ)
    convertido_at = Column(TIMESTAMPTZ)
