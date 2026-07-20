from decimal import Decimal
from sqlalchemy import Column, Integer, String, Boolean, Date, Numeric, SmallInteger, Text, ForeignKey, CHAR, UniqueConstraint, Computed
from sqlalchemy.dialects.postgresql import TIMESTAMP, JSONB

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
    contacto            = Column(String(120))
    telefono_contacto   = Column(String(20))
    email_contacto      = Column(String(120))
    representante_legal = Column(String(120))
    rut_representante_legal = Column(String(15))
    logo_url            = Column(Text)
    prefijo             = Column(String(10))
    activa              = Column(Boolean, default=True)
    created_at          = Column(TIMESTAMPTZ, server_default=func.now())
    updated_at          = Column(TIMESTAMPTZ, server_default=func.now(), onupdate=func.now())


class Contador(Base):
    __tablename__ = "contadores"
    __table_args__ = (UniqueConstraint("id_empresa", "entidad"), {"schema": "erp"})

    id            = Column(Integer, primary_key=True)
    id_empresa    = Column(Integer, ForeignKey("erp.empresas.id"), nullable=False)
    entidad       = Column(String(20), nullable=False)
    ultimo_numero = Column(Integer, nullable=False, default=0)


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
    codigo            = Column(String(30))
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
    region            = Column(String(80))
    telefono          = Column(String(20))
    email_personal    = Column(String(120))
    email_corporativo = Column(String(120))
    id_departamento   = Column(Integer, ForeignKey("erp.departamentos.id"))
    id_cargo          = Column(Integer, ForeignKey("erp.cargos.id"))
    fecha_ingreso     = Column(Date, nullable=False)
    fecha_egreso      = Column(Date)
    activo            = Column(Boolean, default=True)
    sueldo_base       = Column(Numeric(12, 2))
    colacion          = Column(Numeric(12, 2), nullable=False, default=0)
    movilizacion      = Column(Numeric(12, 2), nullable=False, default=0)
    id_afp            = Column(Integer, ForeignKey("erp.afp.id"))
    id_isapre         = Column(Integer, ForeignKey("erp.isapre.id"))
    id_tipo_contrato  = Column(Integer, ForeignKey("erp.tipo_contrato.id"))
    valor_isapre_uf   = Column(Numeric(8,4), default=Decimal("0"))
    n_cargas          = Column(SmallInteger, default=0)
    banco             = Column(String(60))
    tipo_cuenta       = Column(String(30))
    numero_cuenta     = Column(String(30))
    created_at        = Column(TIMESTAMPTZ, server_default=func.now())
    updated_at        = Column(TIMESTAMPTZ, server_default=func.now(), onupdate=func.now())

    departamento     = relationship("Departamento", back_populates="empleados")
    cargo             = relationship("Cargo", back_populates="empleados")
    centro_costo      = relationship("CentroCosto")
    contratos         = relationship("Contrato", back_populates="empleado")
    licencias         = relationship("Licencia", back_populates="empleado", foreign_keys="Licencia.id_empleado")
    afp_rel           = relationship("AFP")
    isapre_rel        = relationship("Isapre")
    tipo_contrato_rel = relationship("TipoContrato")

class Contrato(Base):
    __tablename__ = "contratos"
    __table_args__ = {"schema": "erp"}

    id                    = Column(Integer, primary_key=True)
    id_empleado           = Column(Integer, ForeignKey("erp.empleados.id"), nullable=False)
    id_tipo_contrato      = Column(Integer, ForeignKey("erp.tipo_contrato.id"), nullable=False)
    id_obra               = Column(Integer, ForeignKey("erp.obras.id"))
    id_centro_costo       = Column(Integer, ForeignKey("erp.centros_costo.id"))
    id_cargo              = Column(Integer, ForeignKey("erp.cargos.id"))
    numero_contrato       = Column(String(30))
    fecha_contrato        = Column(Date, nullable=False)
    fecha_inicio          = Column(Date, nullable=False)
    fecha_termino_pactada = Column(Date)
    fecha_termino_real    = Column(Date)
    id_motivo_termino     = Column(Integer, ForeignKey("erp.motivos_termino.id"))
    aviso_previo_fecha    = Column(Date)
    sueldo_bruto          = Column(Numeric(12, 2), nullable=False)
    colacion              = Column(Numeric(12, 2), nullable=False, default=0)
    movilizacion          = Column(Numeric(12, 2), nullable=False, default=0)
    horas_semanales       = Column(SmallInteger, default=42)
    jornada               = Column(String(30), default="Completa")
    horario_detalle       = Column(Text)
    estado                = Column(String(20), nullable=False, default="vigente")  # vigente / finiquitado / anulado
    id_contrato_origen    = Column(Integer, ForeignKey("erp.contratos.id"))
    finiquito_ratificado       = Column(Boolean, nullable=False, default=False)  # Art. 177 CT: ratificación ante notario/inspector del trabajo o DT online
    finiquito_fecha_ratificacion = Column(Date)
    finiquito_ministro_fe      = Column(String(100))  # notario, inspector del trabajo, presidente de sindicato, etc.
    created_at            = Column(TIMESTAMPTZ, server_default=func.now())

    empleado          = relationship("Empleado", back_populates="contratos", foreign_keys=[id_empleado])
    tipo_contrato_rel = relationship("TipoContrato")
    anexos = relationship("AnexoContrato", back_populates="contrato")
    documentos = relationship("ContratoDocumento", back_populates="contrato")
    requisitos_obra = relationship("ContratoRequisitoObra", back_populates="contrato")


class MotivoTermino(Base):
    __tablename__ = "motivos_termino"
    __table_args__ = {"schema": "erp"}

    id          = Column(Integer, primary_key=True)
    codigo      = Column(String(30), unique=True, nullable=False)
    nombre      = Column(String(120), nullable=False)
    articulo_ct = Column(String(10))


class TipoAnexo(Base):
    __tablename__ = "tipo_anexo"
    __table_args__ = {"schema": "erp"}

    id     = Column(Integer, primary_key=True)
    codigo = Column(String(30), unique=True, nullable=False)
    nombre = Column(String(100), nullable=False)


class AnexoContrato(Base):
    __tablename__ = "anexos_contrato"
    __table_args__ = {"schema": "erp"}

    id            = Column(Integer, primary_key=True)
    id_contrato   = Column(Integer, ForeignKey("erp.contratos.id"), nullable=False)
    id_empleado   = Column(Integer, ForeignKey("erp.empleados.id"), nullable=False)
    id_empresa    = Column(Integer, ForeignKey("erp.empresas.id"), nullable=False)
    id_tipo_anexo = Column(Integer, ForeignKey("erp.tipo_anexo.id"), nullable=False)
    fecha_anexo   = Column(Date, nullable=False)
    nuevo_sueldo  = Column(Numeric(12, 2))
    id_nueva_obra = Column(Integer, ForeignKey("erp.obras.id"))
    nuevo_cargo   = Column(String(100))
    nueva_jornada = Column(String(30))
    nueva_fecha_termino = Column(Date)
    valor_anterior = Column(JSONB)
    valor_nuevo    = Column(JSONB)
    observacion   = Column(Text)
    created_at    = Column(TIMESTAMPTZ, server_default=func.now())

    contrato = relationship("Contrato", back_populates="anexos")
    tipo_anexo = relationship("TipoAnexo")


class ContratoDocumento(Base):
    __tablename__ = "contrato_documentos"
    __table_args__ = {"schema": "erp"}

    id               = Column(Integer, primary_key=True)
    id_contrato      = Column(Integer, ForeignKey("erp.contratos.id"), nullable=False)
    id_empresa       = Column(Integer, ForeignKey("erp.empresas.id"), nullable=False)
    id_anexo         = Column(Integer, ForeignKey("erp.anexos_contrato.id"))
    tipo_documento   = Column(String(30), nullable=False)
    onedrive_item_id = Column(String(200))
    url_compartido   = Column(String(500))
    nombre_original  = Column(String(200))
    fecha_carga      = Column(TIMESTAMPTZ, server_default=func.now())
    id_usuario_carga = Column(Integer, ForeignKey("erp.usuarios.id"))
    created_at       = Column(TIMESTAMPTZ, server_default=func.now())

    contrato = relationship("Contrato", back_populates="documentos")


class ContratoRequisitoObra(Base):
    __tablename__ = "contrato_requisitos_obra"
    __table_args__ = {"schema": "erp"}

    id                       = Column(Integer, primary_key=True)
    id_contrato              = Column(Integer, ForeignKey("erp.contratos.id"), nullable=False)
    id_empresa               = Column(Integer, ForeignKey("erp.empresas.id"), nullable=False)
    id_obra                  = Column(Integer, ForeignKey("erp.obras.id"), nullable=False)
    id_anexo                 = Column(Integer, ForeignKey("erp.anexos_contrato.id"))
    irl_ds44_folio           = Column(String(30))
    irl_ds44_fecha           = Column(Date)
    irl_ds44_aprobada        = Column(Boolean)
    fecha_ingreso_obra       = Column(Date)
    observaciones            = Column(Text)
    created_at               = Column(TIMESTAMPTZ, server_default=func.now())
    updated_at               = Column(TIMESTAMPTZ, server_default=func.now(), onupdate=func.now())

    contrato = relationship("Contrato", back_populates="requisitos_obra")
    entregas_epp = relationship("EntregaEpp", back_populates="requisito_obra")


class EntregaEpp(Base):
    __tablename__ = "entrega_epp"
    __table_args__ = {"schema": "erp"}

    id                = Column(Integer, primary_key=True)
    id_contrato       = Column(Integer, ForeignKey("erp.contratos.id"), nullable=False)
    id_empresa        = Column(Integer, ForeignKey("erp.empresas.id"), nullable=False)
    id_requisito_obra = Column(Integer, ForeignKey("erp.contrato_requisitos_obra.id"))
    folio             = Column(String(30))
    fecha_entrega     = Column(Date, nullable=False)
    items             = Column(JSONB)
    entregado_por     = Column(String(200), default="Salvador Calderón")
    observaciones     = Column(Text)
    created_at        = Column(TIMESTAMPTZ, server_default=func.now())

    requisito_obra = relationship("ContratoRequisitoObra", back_populates="entregas_epp")


class PactoHorasExtra(Base):
    __tablename__ = "pactos_horas_extra"
    __table_args__ = {"schema": "erp"}

    id                 = Column(Integer, primary_key=True)
    id_contrato        = Column(Integer, ForeignKey("erp.contratos.id"), nullable=False)
    id_empresa         = Column(Integer, ForeignKey("erp.empresas.id"), nullable=False)
    fecha_inicio       = Column(Date, nullable=False)
    fecha_termino      = Column(Date, nullable=False)
    tope_horas_diarias = Column(Numeric(4, 2), nullable=False, default=Decimal("2"))
    porcentaje_recargo = Column(Numeric(5, 4), nullable=False, default=Decimal("0.50"))
    created_at         = Column(TIMESTAMPTZ, server_default=func.now())

class TipoLicencia(Base):
    __tablename__ = "tipo_licencia"
    __table_args__ = {"schema": "erp"}
    id     = Column(Integer, primary_key=True)
    codigo = Column(String(30), unique=True, nullable=False)
    nombre = Column(String(100), nullable=False)


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

    empleado = relationship("Empleado", back_populates="licencias", foreign_keys=[id_empleado])


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
    total_imponible      = Column(Numeric(12,2), Computed("sueldo_base + gratificacion + horas_extra_50 + horas_extra_100 + aguinaldo", persisted=True))
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


class EmpresaCredencial(Base):
    """
    Credenciales externas (Previred / Mi DT - Clave Única) guardadas por
    empresa, solo como referencia para el usuario. La password se persiste
    cifrada (Fernet, ver app.core.crypto) y nunca se expone en texto plano
    vía API; la aplicación no realiza login automático con estos datos.
    """
    __tablename__ = "empresa_credenciales"
    __table_args__ = (
        UniqueConstraint("id_empresa", "tipo", name="uq_empresa_credencial_tipo"),
        {"schema": "erp"},
    )

    id               = Column(Integer, primary_key=True)
    id_empresa       = Column(Integer, ForeignKey("erp.empresas.id"), nullable=False)
    tipo             = Column(String(20), nullable=False)  # PREVIRED | CLAVE_UNICA
    usuario          = Column(String(120), nullable=False)
    password_cifrada = Column(Text, nullable=False)
    created_at       = Column(TIMESTAMPTZ, server_default=func.now())
    updated_at       = Column(TIMESTAMPTZ, server_default=func.now(), onupdate=func.now())


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
    cerrado               = Column(Boolean, nullable=False, default=False)
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


class RegistroAsistencia(Base):
    __tablename__ = "registro_asistencia"
    __table_args__ = (
        UniqueConstraint("periodo", "id_empleado", "dia", name="uq_asistencia_periodo_emp_dia"),
        {"schema": "erp"},
    )

    id          = Column(Integer, primary_key=True)
    periodo     = Column(String(7), nullable=False)   # YYYY-MM
    id_empleado = Column(Integer, ForeignKey("erp.empleados.id"), nullable=False)
    dia         = Column(SmallInteger, nullable=False)  # 1–31
    # VERDE=presente, ROJO=sábado/domingo/feriado presente, AUSENTE=falta
    estado      = Column(String(10), nullable=False, default="VERDE")

    empleado    = relationship("Empleado")
