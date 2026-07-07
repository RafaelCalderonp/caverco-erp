from sqlalchemy import Column, Integer, String, Text, Numeric, Date, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class ProcedimientoCapacitacion(Base):
    __tablename__ = "procedimientos_capacitacion"
    __table_args__ = {"schema": "erp"}

    id          = Column(Integer, primary_key=True)
    codigo      = Column(String(30), nullable=False, unique=True)
    nombre      = Column(String(200), nullable=False)
    descripcion = Column(Text)
    activo      = Column(Boolean, nullable=False, default=True)
    created_at  = Column(DateTime, default=func.now())

    capacitaciones = relationship("Capacitacion", back_populates="procedimiento")


class Capacitacion(Base):
    __tablename__ = "capacitaciones"
    __table_args__ = {"schema": "erp"}

    id               = Column(Integer, primary_key=True)
    id_empresa       = Column(Integer, nullable=False)
    id_procedimiento = Column(Integer, ForeignKey("erp.procedimientos_capacitacion.id"), nullable=True)
    categoria        = Column(String(50), nullable=False)
    categoria_tipo   = Column(String(10), nullable=False, default="SSO")
    fecha            = Column(Date, nullable=False)
    hora             = Column(String(10))
    obra             = Column(String(200))
    relator_nombre   = Column(String(200))
    relator_cargo    = Column(String(200))
    lugar            = Column(String(200))
    material_apoyo   = Column(Text)
    duracion_horas   = Column(Numeric(5, 1))
    total_hh         = Column(Numeric(8, 1))
    tema_descripcion = Column(Text)
    created_at       = Column(DateTime, default=func.now())

    procedimiento = relationship("ProcedimientoCapacitacion", back_populates="capacitaciones")
    asistentes    = relationship("AsistenteCapacitacion", back_populates="capacitacion",
                                 cascade="all, delete-orphan", order_by="AsistenteCapacitacion.orden")


class AsistenteCapacitacion(Base):
    __tablename__ = "asistentes_capacitacion"
    __table_args__ = {"schema": "erp"}

    id               = Column(Integer, primary_key=True)
    id_capacitacion  = Column(Integer, ForeignKey("erp.capacitaciones.id", ondelete="CASCADE"), nullable=False)
    orden            = Column(Integer, nullable=False, default=1)
    nombre           = Column(String(200), nullable=False)
    cargo            = Column(String(200))
    rut              = Column(String(20))
    created_at       = Column(DateTime, default=func.now())

    capacitacion = relationship("Capacitacion", back_populates="asistentes")
