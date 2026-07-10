from sqlalchemy import Column, Integer, String, Text, Numeric, Date, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class ProcedimientoCapacitacion(Base):
    __tablename__ = "procedimientos_capacitacion"
    __table_args__ = {"schema": "erp"}

    id                    = Column(Integer, primary_key=True)
    codigo                = Column(String(30), nullable=False, unique=True)
    nombre                = Column(String(300), nullable=False)
    objetivo_general      = Column(Text)
    objetivos_especificos = Column(Text)
    activo                = Column(Boolean, nullable=False, default=True)
    empresa_rut_filtro    = Column(String(20), nullable=True, default=None)
    created_at            = Column(DateTime, default=func.now())

    capacitaciones = relationship("Capacitacion", back_populates="procedimiento")


class Capacitacion(Base):
    __tablename__ = "capacitaciones"
    __table_args__ = {"schema": "erp"}

    id                    = Column(Integer, primary_key=True)
    id_empresa            = Column(Integer, nullable=False)
    id_procedimiento      = Column(Integer, ForeignKey("erp.procedimientos_capacitacion.id"), nullable=True)
    version               = Column(String(10), nullable=False, default="01")
    motivo                = Column(String(30), nullable=False, default="CAPACITACION")
    fecha                 = Column(Date, nullable=False)
    hora_inicio           = Column(String(10))
    hora_termino          = Column(String(10))
    duracion_horas        = Column(Numeric(5, 1))
    obra                  = Column(String(300))
    relator_nombre        = Column(String(200))
    relator_area          = Column(String(200))
    relator_rut           = Column(String(20))
    objetivo_general      = Column(Text)
    objetivos_especificos = Column(Text)
    lugar_establecimiento = Column(Text)
    material_apoyo        = Column(Text)
    created_at            = Column(DateTime, default=func.now())

    procedimiento = relationship("ProcedimientoCapacitacion", back_populates="capacitaciones")
    asistentes    = relationship("AsistenteCapacitacion", back_populates="capacitacion",
                                 cascade="all, delete-orphan", order_by="AsistenteCapacitacion.orden")


class AsistenteCapacitacion(Base):
    __tablename__ = "asistentes_capacitacion"
    __table_args__ = {"schema": "erp"}

    id              = Column(Integer, primary_key=True)
    id_capacitacion = Column(Integer, ForeignKey("erp.capacitaciones.id", ondelete="CASCADE"), nullable=False)
    orden           = Column(Integer, nullable=False, default=1)
    nombre          = Column(String(200), nullable=False)
    area            = Column(String(200))
    rut             = Column(String(20))
    created_at      = Column(DateTime, default=func.now())

    capacitacion = relationship("Capacitacion", back_populates="asistentes")
