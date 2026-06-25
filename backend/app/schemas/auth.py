from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

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
    rol: str = "VIEWER"
    id_empleado: Optional[int] = None
