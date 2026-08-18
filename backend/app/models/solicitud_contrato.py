from sqlalchemy import Column, Integer, String, Date, CHAR, Numeric, SmallInteger, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.sql import func
from app.core.database import Base

TIMESTAMPTZ = TIMESTAMP(timezone=True)


class EnlacePostulacion(Base):
    """
    Enlace reutilizable ligado a una sola empresa: quien lo recibe puede
    completar el formulario público sin poder ver ni cambiar la empresa.
    Un mismo enlace puede recibir varias postulaciones (una por persona).
    """
    __tablename__ = "enlaces_postulacion"
    __table_args__ = {"schema": "erp"}

    id                = Column(Integer, primary_key=True)
    id_empresa        = Column(Integer, ForeignKey("erp.empresas.id", ondelete="CASCADE"), nullable=False)
    token             = Column(String(64), nullable=False, unique=True)
    nombre_referencia = Column(String(150))
    activo            = Column(Boolean, nullable=False, default=True)
    created_at        = Column(TIMESTAMPTZ, server_default=func.now())


class PostulacionContrato(Base):
    """Una fila por cada persona que completó el formulario público de un enlace."""
    __tablename__ = "postulaciones_contrato"
    __table_args__ = (
        CheckConstraint("estado IN ('ENVIADA', 'CONVERTIDA')", name="chk_postulaciones_contrato_estado"),
        {"schema": "erp"},
    )

    id        = Column(Integer, primary_key=True)
    id_enlace = Column(Integer, ForeignKey("erp.enlaces_postulacion.id", ondelete="CASCADE"), nullable=False)
    estado    = Column(String(20), nullable=False, default="ENVIADA")

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
    convertido_at = Column(TIMESTAMPTZ)
