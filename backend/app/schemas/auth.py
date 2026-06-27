from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from datetime import datetime

RolUsuario = Literal["SUPERADMIN", "ADMIN", "RRHH", "VIEWER"]

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UsuarioOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    rol: str
    activo: bool
    ultimo_login: Optional[datetime] = None
    model_config = {"from_attributes": True}

class UsuarioCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    rol: RolUsuario = "VIEWER"
    id_empleado: Optional[int] = None

class UsuarioUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    rol: Optional[RolUsuario] = None
    activo: Optional[bool] = None
    id_empleado: Optional[int] = None

class ResetPasswordIn(BaseModel):
    password_nueva: str

class CambiarPasswordIn(BaseModel):
    password_actual: str
    password_nueva: str
