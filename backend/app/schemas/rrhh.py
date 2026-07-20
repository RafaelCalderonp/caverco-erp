from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

# ---- Empresa ----
class EmpresaBase(BaseModel):
    rut: str
    razon_social: str
    nombre_fantasia: Optional[str] = None
    giro: Optional[str] = None
    direccion: Optional[str] = None
    comuna: Optional[str] = None
    ciudad: Optional[str] = "Santiago"
    region: Optional[str] = None
    telefono: Optional[str] = None
    email: str
    contacto: Optional[str] = None
    telefono_contacto: Optional[str] = None
    email_contacto: Optional[str] = None
    representante_legal: str
    rut_representante_legal: str
    logo_url: Optional[str] = None
    prefijo: Optional[str] = None

class EmpresaCreate(EmpresaBase): pass

class EmpresaUpdate(BaseModel):
    razon_social: Optional[str] = None
    nombre_fantasia: Optional[str] = None
    giro: Optional[str] = None
    direccion: Optional[str] = None
    comuna: Optional[str] = None
    ciudad: Optional[str] = None
    region: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    contacto: Optional[str] = None
    telefono_contacto: Optional[str] = None
    email_contacto: Optional[str] = None
    representante_legal: Optional[str] = None
    rut_representante_legal: Optional[str] = None
    logo_url: Optional[str] = None
    prefijo: Optional[str] = None
    activa: Optional[bool] = None

class EmpresaOut(EmpresaBase):
    id: int
    activa: bool
    model_config = {"from_attributes": True}

# ---- Departamento ----
class DepartamentoBase(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None

class DepartamentoCreate(DepartamentoBase): pass
class DepartamentoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None

class DepartamentoOut(DepartamentoBase):
    id: int
    activo: bool
    model_config = {"from_attributes": True}

# ---- Cargo ----
class CargoBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    nivel: int = 1
    id_departamento: Optional[int] = None

class CargoCreate(CargoBase):
    id_empresa: int

class CargoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    nivel: Optional[int] = None
    id_departamento: Optional[int] = None
    activo: Optional[bool] = None

class CargoOut(CargoBase):
    id: int
    codigo: str
    activo: bool
    model_config = {"from_attributes": True}

# ---- CentroCosto ----
class CentroCostoBase(BaseModel):
    codigo: str
    nombre: str

class CentroCostoCreate(CentroCostoBase):
    id_empresa: int

class CentroCostoUpdate(BaseModel):
    codigo: Optional[str] = None
    nombre: Optional[str] = None
    activo: Optional[bool] = None

class CentroCostoOut(CentroCostoBase):
    id: int
    activo: bool
    model_config = {"from_attributes": True}

# ---- Obra ----
class ObraBase(BaseModel):
    nombre: str
    direccion: Optional[str] = None
    comuna: Optional[str] = None
    region: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None

class ObraCreate(ObraBase):
    id_empresa: int

class ObraUpdate(BaseModel):
    nombre: Optional[str] = None
    direccion: Optional[str] = None
    comuna: Optional[str] = None
    region: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    activa: Optional[bool] = None

class ObraOut(ObraBase):
    id: int
    codigo: str
    activa: bool
    model_config = {"from_attributes": True}

# ---- Empleado ----
class EmpleadoBase(BaseModel):
    rut: str
    nombres: str
    apellido_paterno: str
    apellido_materno: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    genero: Optional[str] = None
    estado_civil: Optional[str] = None
    nacionalidad: Optional[str] = "Chilena"
    direccion: Optional[str] = None
    comuna: Optional[str] = None
    ciudad: Optional[str] = "Santiago"
    region: Optional[str] = None
    telefono: Optional[str] = None
    email_personal: Optional[str] = None
    email_corporativo: Optional[str] = None
    id_departamento: Optional[int] = None
    id_cargo: Optional[int] = None
    id_centro_costo: Optional[int] = None
    fecha_ingreso: date
    sueldo_base: Optional[Decimal] = None
    colacion: Optional[Decimal] = Decimal("0")
    movilizacion: Optional[Decimal] = Decimal("0")
    id_afp: Optional[int] = None
    id_isapre: Optional[int] = None
    valor_isapre_uf: Optional[Decimal] = None
    n_cargas: Optional[int] = 0
    id_tipo_contrato: Optional[int] = None
    banco: Optional[str] = None
    tipo_cuenta: Optional[str] = None
    numero_cuenta: Optional[str] = None

class EmpleadoCreate(EmpleadoBase):
    id_empresa: int

class EmpleadoUpdate(BaseModel):
    nombres: Optional[str] = None
    apellido_paterno: Optional[str] = None
    apellido_materno: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    genero: Optional[str] = None
    estado_civil: Optional[str] = None
    nacionalidad: Optional[str] = None
    direccion: Optional[str] = None
    comuna: Optional[str] = None
    ciudad: Optional[str] = None
    region: Optional[str] = None
    telefono: Optional[str] = None
    email_personal: Optional[str] = None
    email_corporativo: Optional[str] = None
    id_departamento: Optional[int] = None
    id_cargo: Optional[int] = None
    id_centro_costo: Optional[int] = None
    sueldo_base: Optional[Decimal] = None
    colacion: Optional[Decimal] = None
    movilizacion: Optional[Decimal] = None
    id_afp: Optional[int] = None
    id_isapre: Optional[int] = None
    valor_isapre_uf: Optional[Decimal] = None
    n_cargas: Optional[int] = None
    id_tipo_contrato: Optional[int] = None
    banco: Optional[str] = None
    tipo_cuenta: Optional[str] = None
    numero_cuenta: Optional[str] = None
    activo: Optional[bool] = None
    fecha_egreso: Optional[date] = None

class EmpleadoOut(EmpleadoBase):
    id: int
    codigo: Optional[str] = None
    activo: bool
    fecha_egreso: Optional[date] = None
    created_at: datetime
    departamento: Optional[DepartamentoOut] = None
    cargo: Optional[CargoOut] = None
    centro_costo: Optional[CentroCostoOut] = None
    model_config = {"from_attributes": True}

class EmpleadoListOut(BaseModel):
    id: int
    codigo: Optional[str] = None
    rut: str
    nombres: str
    apellido_paterno: str
    apellido_materno: Optional[str] = None
    email_corporativo: Optional[str] = None
    telefono: Optional[str] = None
    fecha_ingreso: date
    activo: bool
    sueldo_base: Optional[Decimal] = None
    departamento: Optional[DepartamentoOut] = None
    cargo: Optional[CargoOut] = None
    model_config = {"from_attributes": True}

# ---- Contrato ----
class ContratoCreate(BaseModel):
    id_empleado: int
    id_tipo_contrato: int
    id_obra: Optional[int] = None
    id_centro_costo: Optional[int] = None
    id_cargo: Optional[int] = None
    numero_contrato: Optional[str] = None
    fecha_contrato: date
    fecha_inicio: date
    fecha_termino_pactada: Optional[date] = None
    sueldo_bruto: Decimal
    colacion: Decimal = Decimal("0")
    movilizacion: Decimal = Decimal("0")
    horas_semanales: int = 42
    jornada: str = "Completa"
    horario_detalle: Optional[str] = None
    id_contrato_origen: Optional[int] = None

class ContratoUpdate(BaseModel):
    id_tipo_contrato: Optional[int] = None
    id_obra: Optional[int] = None
    id_centro_costo: Optional[int] = None
    id_cargo: Optional[int] = None
    numero_contrato: Optional[str] = None
    fecha_contrato: Optional[date] = None
    fecha_inicio: Optional[date] = None
    fecha_termino_pactada: Optional[date] = None
    fecha_termino_real: Optional[date] = None
    id_motivo_termino: Optional[int] = None
    aviso_previo_fecha: Optional[date] = None
    sueldo_bruto: Optional[Decimal] = None
    colacion: Optional[Decimal] = None
    movilizacion: Optional[Decimal] = None
    horas_semanales: Optional[int] = None
    jornada: Optional[str] = None
    horario_detalle: Optional[str] = None
    estado: Optional[str] = None

class EmpleadoMiniOut(BaseModel):
    id: int
    codigo: Optional[str] = None
    nombres: str
    apellido_paterno: str
    apellido_materno: Optional[str] = None
    rut: Optional[str] = None
    cargo_nombre: Optional[str] = None
    id_empresa: Optional[int] = None
    id_afp: Optional[int] = None
    telefono: Optional[str] = None
    email_corporativo: Optional[str] = None
    email_personal: Optional[str] = None
    model_config = {"from_attributes": True}


class ContratoOut(BaseModel):
    id: int
    id_empleado: int
    empleado: Optional[EmpleadoMiniOut] = None
    id_tipo_contrato: int
    id_obra: Optional[int] = None
    id_centro_costo: Optional[int] = None
    id_cargo: Optional[int] = None
    numero_contrato: Optional[str] = None
    fecha_contrato: Optional[date] = None
    fecha_inicio: date
    fecha_termino_pactada: Optional[date] = None
    fecha_termino_real: Optional[date] = None
    id_motivo_termino: Optional[int] = None
    aviso_previo_fecha: Optional[date] = None
    sueldo_bruto: Decimal
    colacion: Decimal = Decimal("0")
    movilizacion: Decimal = Decimal("0")
    horas_semanales: int
    jornada: str
    horario_detalle: Optional[str] = None
    estado: str
    id_contrato_origen: Optional[int] = None
    finiquito_ratificado: bool = False
    finiquito_fecha_ratificacion: Optional[date] = None
    finiquito_ministro_fe: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}

class FiniquitoRatificacionCreate(BaseModel):
    fecha_ratificacion: date
    ministro_fe: str

# ---- Contrato + Trabajador unificado (alta en un solo paso) ----
class ContratoConTrabajadorCreate(BaseModel):
    # Datos del trabajador
    id_empresa: int
    rut: str
    nombres: str
    apellido_paterno: str
    apellido_materno: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    genero: Optional[str] = None
    estado_civil: Optional[str] = None
    nacionalidad: str = "Chilena"
    direccion: Optional[str] = None
    comuna: Optional[str] = None
    region: Optional[str] = None
    ciudad: str = "Santiago"
    telefono: Optional[str] = None
    email_personal: Optional[str] = None
    email_corporativo: Optional[str] = None
    id_departamento: Optional[int] = None
    id_afp: Optional[int] = None
    id_isapre: Optional[int] = None
    valor_isapre_uf: Optional[Decimal] = None
    n_cargas: Optional[int] = 0
    banco: Optional[str] = None
    tipo_cuenta: Optional[str] = None
    numero_cuenta: Optional[str] = None

    # Datos del contrato
    id_tipo_contrato: int
    id_obra: Optional[int] = None
    id_centro_costo: Optional[int] = None
    id_cargo: Optional[int] = None
    numero_contrato: Optional[str] = None
    fecha_contrato: date
    fecha_inicio: date
    fecha_termino_pactada: Optional[date] = None
    sueldo_bruto: Decimal
    colacion: Decimal = Decimal("0")
    movilizacion: Decimal = Decimal("0")
    horas_semanales: int = 42
    jornada: str = "Completa"
    horario_detalle: Optional[str] = None

class ContratoConTrabajadorOut(BaseModel):
    id_empleado: int
    id_contrato: int

# ---- Anexo de Contrato ----
class AnexoContratoCreate(BaseModel):
    id_tipo_anexo: int
    fecha_anexo: date
    nuevo_sueldo: Optional[Decimal] = None
    id_nueva_obra: Optional[int] = None
    nuevo_cargo: Optional[str] = None
    nueva_jornada: Optional[str] = None
    nueva_fecha_termino: Optional[date] = None
    valor_anterior: Optional[dict] = None
    valor_nuevo: Optional[dict] = None
    observacion: Optional[str] = None

class AnexoContratoOut(AnexoContratoCreate):
    id: int
    id_contrato: int
    id_empleado: int
    created_at: datetime
    model_config = {"from_attributes": True}

# ---- Documento de Contrato ----
class ContratoDocumentoCreate(BaseModel):
    id_anexo: Optional[int] = None
    tipo_documento: str
    onedrive_item_id: Optional[str] = None
    url_compartido: Optional[str] = None
    nombre_original: Optional[str] = None

class ContratoDocumentoOut(ContratoDocumentoCreate):
    id: int
    id_contrato: int
    fecha_carga: datetime
    id_usuario_carga: Optional[int] = None
    created_at: datetime
    model_config = {"from_attributes": True}

# ---- Requisito de ingreso a obra ----
class ContratoRequisitoObraCreate(BaseModel):
    id_obra: int
    id_anexo: Optional[int] = None
    irl_ds44_folio: Optional[str] = None
    irl_ds44_fecha: Optional[date] = None
    irl_ds44_aprobada: Optional[bool] = None
    fecha_ingreso_obra: Optional[date] = None
    observaciones: Optional[str] = None

class ContratoRequisitoObraUpdate(BaseModel):
    irl_ds44_folio: Optional[str] = None
    irl_ds44_fecha: Optional[date] = None
    irl_ds44_aprobada: Optional[bool] = None
    fecha_ingreso_obra: Optional[date] = None
    observaciones: Optional[str] = None

class ContratoRequisitoObraOut(ContratoRequisitoObraCreate):
    id: int
    id_contrato: int
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

# ---- Entrega de EPP ----
class EntregaEppCreate(BaseModel):
    id_requisito_obra: Optional[int] = None
    folio: Optional[str] = None
    fecha_entrega: date
    items: Optional[list] = None
    entregado_por: Optional[str] = "Salvador Calderón"
    observaciones: Optional[str] = None

class EntregaEppOut(EntregaEppCreate):
    id: int
    id_contrato: int
    created_at: datetime
    model_config = {"from_attributes": True}

# ---- Pacto de horas extra ----
class PactoHorasExtraCreate(BaseModel):
    fecha_inicio: date
    fecha_termino: date
    tope_horas_diarias: Decimal = Decimal("2")
    porcentaje_recargo: Decimal = Decimal("0.50")

class PactoHorasExtraOut(PactoHorasExtraCreate):
    id: int
    id_contrato: int
    created_at: datetime
    model_config = {"from_attributes": True}

# ---- Licencia ----
class LicenciaCreate(BaseModel):
    id_tipo_licencia: int
    fecha_inicio: date
    fecha_fin: date
    dias_habiles: Optional[int] = None
    motivo: Optional[str] = None

class LicenciaUpdate(BaseModel):
    estado: Optional[str] = None
    observacion: Optional[str] = None
    aprobado_por: Optional[int] = None

class LicenciaOut(LicenciaCreate):
    id: int
    id_empleado: int
    estado: str
    aprobado_por: Optional[int] = None
    fecha_aprobacion: Optional[datetime] = None
    created_at: datetime
    model_config = {"from_attributes": True}

# ---- Auth ----
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None
    rol: Optional[str] = None
