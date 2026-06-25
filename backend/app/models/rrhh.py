from decimal import Decimal
from sqlalchemy import Column, Integer, String, Boolean, Date, Numeric, SmallInteger, Text, ForeignKey, CHAR, UniqueConstraint
from sqlalchemy.dialects.postgresql import TIMESTAMP

TIMESTAMPTZ = TIMESTAMP(timezone=True)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Empresa(Base):
    __tablename__ = "empresas"
    __table_args__ = {"schema": "erp"}

    id                  = Column(Integer, primary_key=True)
    rut                 = Column(String(15), unique=True, nullable=False)
    razon_social        = Column(String(150), nullable=False)
    nombre_fantasia     = Column(String(150))
    giro                = Column(String(200))
    direccion           = Column(String(200))
    comuna              = Column(String(80))
    ciudad              = Column(String(80), default="Santiago")
    region              = Column(String(80))
    telefono            = Column(String(20))
    email               = Column(String(120))
    representante_legal = Column(String(120))
    activa              = Column(Boolean, default=True)
    created_at          = Column(TIMESTAMPTZ, server_default=func.now())
    updated_at          = Column(TIMESTAMPTZ, server_default=func.now(), onupdate=func.now())


class Obra(Base):
    __tablename__ = "obras"
    __table_args__ = {"schema": "erp"}

    id           = Column(Integer, primary_key=True)
    id_empresa   = Column(Integer, ForeignKey("erp.empresas.id"), nullable=False)
    codigo       = Column(String(20))
    nombre       = Column(String(150), nullable=False)
    direccion    = Column(String(200))
    comuna       = Column(String(80))
    region       = Column(String(80))
    fecha_inicio = Column(Date)
    fecha_fin    = Column(Date)
    activa       = Column(Boolean, default=True)


class CentroCosto(Base):
    __tablename__ = "centros_costo"
    __table_args__ = {"schema": "erp"}

    id         = Column(Integer, primary_key=True)
    id_empresa = Column(Integer, ForeignKey("erp.empresas.id"), nullable=False)
    codigo     = Column(String(20), nullable=False)
    nombre     = Column(String(100), nullable=False)
    activo     = Column(Boolean, default=True)


class Departamento(Base):
    __tablename__ = "departamentos"
    __table_args__ = {"schema": "erp"}

    id          = Column(Integer, primary_key=True)
    id_empresa  = Column(Integer, ForeignKey("erp.empresas.id"), nullable=False)
    codigo      = Column(String(10), nullable=False)
    nombre      = Column(String(100), nullable=False)
    descripcion = Column(Text)
    activo      = Column(Boolean, default=True)
    created_at  = Column(TIMESTAMPTZ, server_default=func.now())
    updated_at  = Column(TIMESTAMPTZ, server_default=func.now(), onupdate=func.now())

    cargos    = relationship("Cargo", back_populates="departamento")
    empleados = relationship("Empleado", back_populates="departamento")

class Cargo(Base):
    __tablename__ = "cargos"
    __table_args__ = {"schema": "erp"}

    id              = Column(Integer, primary_key=True)
    id_empresa      = Column(Integer, ForeignKey("erp.empresas.id"), nullable=False)
    codigo          = Column(String(20), nullable=False)
    nombre          = Column(String(100), nullable=False)
    descripcion     = Column(Text)
    nivel           = Column(SmallInteger, default=1)
    id_departamento = Column(Integer, ForeignKey("erp.departamentos.id"))
    activo          = Column(Boolean, default=True)
    created_at      = Column(TIMESTAMPTZ, server_default=func.now())
    updated_at      = Column(TIMESTAMPTZ, server_default=func.now(), onupdate=func.now())

    departamento = relationship("Departamento", back_populates="cargos")
    empleados    = relationship("Empleado", back_populates="cargo")

class Empleado(Base):
    __tablename__ = "empleados"
    __table_args__ = {"schema": "erp"}

    id                = Column(Integer, primary_key=True)
    id_empresa        = Column(Integer, ForeignKey("erp.empresas.id"), nullable=False)
    id_centro_costo   = Column(Integer, ForeignKey("erp.centros_costo.id"))
    id_obra           = Column(Integer, ForeignKey("erp.obras.id"))
    rut               = Column(String(12), nullable=False)
    nombres           = Column(String(100), nullable=False)
    apellido_paterno  = Column(String(60), nullable=False)
    apellido_materno  = Column(String(60))
    fecha_nacimiento  = Column(Date)
    genero            = Column(CHAR(1))
    estado_civil      = Column(String(20))
    nacionalidad      = Column(String(50), default="Chilena")
    direccion         = Column(String(200))
    comuna            = Column(String(80))
    ciudad            = Column(String(80), default="Santiago")
    telefono          = Column(String(20))
    email_personal    = Column(String(120))
    email_corporativo = Column(String(120))
    id_departamento   = Column(Integer, ForeignKey("erp.departamentos.id"))
    id_cargo          = Column(Integer, ForeignKey("erp.cargos.id"))
    fecha_ingreso     = Column(Date, nullable=False)
    fecha_egreso      = Column(Date)
    activo            = Column(Boolean, default=True)
    sueldo_base       = Column(Numeric(12, 2))
    id_afp            = Column(Integer, ForeignKey("erp.afp.id"))
    id_isapre         = Column(Integer, ForeignKey("erp.isapre.id"))
    id_tipo_contrato  = Column(Integer, ForeignKey("erp.tipo_contrato.id"))
    valor_isapre_uf   = Column(Numeric(8,4), default=Decimal("0"))
    n_cargas          = Column(SmallInteger, default=0)
    created_at        = Column(TIMESTAMPTZ, server_default=func.now())
    updated_at        = Column(TIMESTAMPTZ, server_default=func.now(), onupdate=func.now())

    departamento     = relationship("Departamento", back_populates="empleados")
    cargo             = relationship("Cargo", back_populates="empleados")
    contratos         = relationship("Contrato", back_populates="empleado")
    afp_rel           = relationship("AFP")
    isapre_rel        = relationship("Isapre")
    tipo_contrato_rel = relationship("TipoContrato")

class Contrato(Base):
    __tablename__ = "contratos"
    __table_args__ = {"schema": "erp"}

    id               = Column(Integer, primary_key=True)
    id_empleado      = Column(Integer, ForeignKey("erp.empleados.id"), nullable=False)
    id_tipo_contrato = Column(Integer, ForeignKey("erp.tipo_contrato.id"), nullable=False)
    id_obra          = Column(Integer, ForeignKey("erp.obras.id"))
    fecha_contrato   = Column(Date)
    fecha_inicio     = Column(Date, nullable=False)
    fecha_termino    = Column(Date)
    sueldo_bruto     = Column(Numeric(12, 2), nullable=False)
    horas_semanales  = Column(SmallInteger, default=45)
    jornada          = Column(String(30), default="Completa")
    descripcion      = Column(Text)
    activo           = Column(Boolean, default=True)
    created_at       = Column(TIMESTAMPTZ, server_default=func.now())
    updated_at       = Column(TIMESTAMPTZ, server_default=func.now(), onupdate=func.now())

    empleado = relationship("Empleado", back_populates="contratos")

# NOTA: schema_v2_multiempresa.sql todavía no define la tabla `licencias` —
# este modelo queda mapeado pero el endpoint fallará hasta que se agregue
# la tabla al esquema "erp" (pendiente, fuera del alcance de auth/indicadores).
class Licencia(Base):
    __tablename__ = "licencias"
    __table_args__ = {"schema": "erp"}

    id               = Column(Integer, primary_key=True)
    id_empleado      = Column(Integer, ForeignKey("erp.empleados.id"), nullable=False)
    id_tipo_licencia = Column(Integer, ForeignKey("erp.tipo_licencia.id"), nullable=False)
    fecha_inicio     = Column(Date, nullable=False)
    fecha_fin        = Column(Date, nullable=False)
    dias_habiles     = Column(SmallInteger)
    motivo           = Column(Text)
    estado           = Column(String(20), default="PENDIENTE")
    aprobado_por     = Column(Integer, ForeignKey("erp.empleados.id"))
    fecha_aprobacion = Column(TIMESTAMPTZ)
    observacion      = Column(Text)
    created_at       = Column(TIMESTAMPTZ, server_default=func.now())
    updated_at       = Column(TIMESTAMPTZ, server_default=func.now(), onupdate=func.now())

    empleado = relationship("Empleado", foreign_keys=[id_empleado])


# ── Modelos previsionales ──────────────────────────────────────────────
class AFP(Base):
    __tablename__ = "afp"
    __table_args__ = {"schema": "erp"}
    id       = Column(Integer, primary_key=True)
    codigo   = Column(Integer, unique=True, nullable=False)
    nombre   = Column(String(40), nullable=False)
    tasa     = Column(Numeric(6,4), nullable=False)
    tasa_sis = Column(Numeric(6,4), nullable=False, default=Decimal("0.0249"))
    activa   = Column(Boolean, default=True)

class Isapre(Base):
    __tablename__ = "isapre"
    __table_args__ = {"schema": "erp"}
    id        = Column(Integer, primary_key=True)
    codigo    = Column(Integer, unique=True, nullable=False)
    nombre    = Column(String(60), nullable=False)
    es_fonasa = Column(Boolean, default=False)
    activa    = Column(Boolean, default=True)

class TipoContrato(Base):
    __tablename__ = "tipo_contrato"
    __table_args__ = {"schema": "erp"}
    id             = Column(Integer, primary_key=True)
    codigo         = Column(String(20), unique=True, nullable=False)
    nombre         = Column(String(80), nullable=False)
    afc_empleador  = Column(Numeric(5,4))
    afc_trabajador = Column(Numeric(5,4))


class Liquidacion(Base):
    __tablename__ = "liquidaciones"
    __table_args__ = {"schema": "erp"}
    id                   = Column(Integer, primary_key=True)
    id_empresa           = Column(Integer, ForeignKey("erp.empresas.id"), nullable=False)
    id_empleado          = Column(Integer, ForeignKey("erp.empleados.id"), nullable=False)
    periodo              = Column(String(7), nullable=False)
    id_afp               = Column(Integer, ForeignKey("erp.afp.id"))
    id_isapre            = Column(Integer, ForeignKey("erp.isapre.id"))
    valor_uf             = Column(Numeric(10,2))
    valor_utm            = Column(Numeric(10,2))
    sueldo_base          = Column(Numeric(12,2), nullable=False, default=0)
    gratificacion        = Column(Numeric(12,2), nullable=False, default=0)
    horas_extra_50       = Column(Numeric(12,2), nullable=False, default=0)
    horas_extra_100      = Column(Numeric(12,2), nullable=False, default=0)
    aguinaldo            = Column(Numeric(12,2), nullable=False, default=0)
    total_imponible      = Column(Numeric(12,2))
    colacion             = Column(Numeric(12,2), nullable=False, default=0)
    movilizacion         = Column(Numeric(12,2), nullable=False, default=0)
    viaticos             = Column(Numeric(12,2), nullable=False, default=0)
    asig_familiar        = Column(Numeric(12,2), nullable=False, default=0)
    otros_haberes        = Column(Numeric(12,2), nullable=False, default=0)
    total_haberes        = Column(Numeric(12,2))
    descuento_afp        = Column(Numeric(12,2), nullable=False, default=0)
    descuento_salud      = Column(Numeric(12,2), nullable=False, default=0)
    adicional_salud      = Column(Numeric(12,2), nullable=False, default=0)
    impuesto_unico       = Column(Numeric(12,2), nullable=False, default=0)
    afc_trabajador = Column(Numeric(12,2), nullable=False, default=0)
    total_desc_legales   = Column(Numeric(12,2))
    anticipo             = Column(Numeric(12,2), nullable=False, default=0)
    prestamo             = Column(Numeric(12,2), nullable=False, default=0)
    total_otros_desc     = Column(Numeric(12,2), nullable=False, default=0)
    base_tributaria      = Column(Numeric(12,2))
    liquido_a_pagar           = Column(Numeric(12,2))
    # Aportes patronales (costos empleador)
    afc_empleador             = Column(Numeric(12,2), nullable=False, default=0)
    sis_empleador             = Column(Numeric(12,2), nullable=False, default=0)
    aporte_empleador_afp      = Column(Numeric(12,2), nullable=False, default=0)   # 0.1%
    seguro_social_empleador   = Column(Numeric(12,2), nullable=False, default=0)   # 0.9%
    total_costo_empleador     = Column(Numeric(12,2), nullable=False, default=0)
    dias_trabajados           = Column(SmallInteger, default=30)
    estado               = Column(String(20), default="BORRADOR")
    observacion          = Column(Text)
    created_at           = Column(TIMESTAMPTZ, server_default=func.now())
    updated_at           = Column(TIMESTAMPTZ, server_default=func.now(), onupdate=func.now())
    __table_args__       = (
        {"schema": "erp"},
    )


# ── Usuarios del sistema (autenticación) ───────────────────────────────
class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = {"schema": "erp"}

    id              = Column(Integer, primary_key=True)
    id_empleado     = Column(Integer, ForeignKey("erp.empleados.id"))
    username        = Column(String(60), unique=True, nullable=False)
    email           = Column(String(120), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    rol             = Column(String(30), default="VIEWER")  # SUPERADMIN/ADMIN/RRHH/VIEWER
    activo          = Column(Boolean, default=True)
    ultimo_login    = Column(TIMESTAMPTZ)
    created_at      = Column(TIMESTAMPTZ, server_default=func.now())
    updated_at      = Column(TIMESTAMPTZ, server_default=func.now(), onupdate=func.now())


# ── Indicadores previsionales versionados por período ──────────────────
class ValorUfUtm(Base):
    __tablename__ = "valores_uf_utm"
    __table_args__ = {"schema": "erp"}

    periodo               = Column(String(7), primary_key=True)  # YYYY-MM
    valor_uf              = Column(Numeric(10,2), nullable=False)
    valor_utm             = Column(Numeric(10,2), nullable=False)
    sueldo_minimo         = Column(Numeric(10,2), default=Decimal("539000"))
    tope_gratificacion    = Column(Numeric(10,2), default=Decimal("213354"))
    renta_tope_afp        = Column(Numeric(12,2), default=Decimal("3581157"))
    renta_tope_afc        = Column(Numeric(12,2), default=Decimal("5379693"))
    sis                   = Column(Numeric(6,4), default=Decimal("0.0249"))
    aporte_empleador_afp  = Column(Numeric(6,4), default=Decimal("0.001"))
    seguro_social         = Column(Numeric(6,4), default=Decimal("0.009"))
    fuente                = Column(String(40), default="MANUAL")  # MANUAL / API_GATEWAY / FALLBACK
    created_at            = Column(TIMESTAMPTZ, server_default=func.now())


class TramoImpuestoUnico(Base):
    __tablename__ = "tramos_impuesto_unico"
    __table_args__ = {"schema": "erp"}

    id           = Column(Integer, primary_key=True)
    periodo      = Column(String(7), nullable=False)  # YYYY-MM de vigencia
    desde        = Column(Numeric(14,2), nullable=False)
    hasta        = Column(Numeric(14,2))  # NULL = sin límite
    factor       = Column(Numeric(5,4), nullable=False)
    monto_rebaja = Column(Numeric(14,2), nullable=False)
