from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

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
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    nivel: int = 1
    id_departamento: Optional[int] = None

class CargoCreate(CargoBase): pass
class CargoOut(CargoBase):
    id: int
    activo: bool
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
    nacionalidad: str = "Chilena"
    direccion: Optional[str] = None
    comuna: Optional[str] = None
    ciudad: str = "Santiago"
    telefono: Optional[str] = None
    email_personal: Optional[str] = None
    email_corporativo: Optional[str] = None
    id_departamento: Optional[int] = None
    id_cargo: Optional[int] = None
    fecha_ingreso: date
    sueldo_base: Optional[Decimal] = None

class EmpleadoCreate(EmpleadoBase): pass

class EmpleadoUpdate(BaseModel):
    nombres: Optional[str] = None
    apellido_paterno: Optional[str] = None
    apellido_materno: Optional[str] = None
    telefono: Optional[str] = None
    email_corporativo: Optional[str] = None
    id_departamento: Optional[int] = None
    id_cargo: Optional[int] = None
    sueldo_base: Optional[Decimal] = None
    activo: Optional[bool] = None
    fecha_egreso: Optional[date] = None

class EmpleadoOut(EmpleadoBase):
    id: int
    activo: bool
    fecha_egreso: Optional[date] = None
    created_at: datetime
    departamento: Optional[DepartamentoOut] = None
    cargo: Optional[CargoOut] = None
    model_config = {"from_attributes": True}

class EmpleadoListOut(BaseModel):
    id: int
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
    id_tipo_contrato: int
    fecha_inicio: date
    fecha_termino: Optional[date] = None
    sueldo_bruto: Decimal
    horas_semanales: int = 45
    jornada: str = "Completa"
    descripcion: Optional[str] = None

class ContratoOut(ContratoCreate):
    id: int
    id_empleado: int
    activo: bool
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
