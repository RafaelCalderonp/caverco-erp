from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    verify_password, hash_password, create_access_token,
    get_current_user, require_roles,
)
from app.models.rrhh import Usuario
from app.schemas.auth import Token, UsuarioOut, UsuarioCreate

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=Token)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.username == form.username))
    usuario = result.scalar_one_or_none()
    if not usuario or not usuario.activo or not verify_password(form.password, usuario.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario o contraseña incorrectos")

    usuario.ultimo_login = datetime.utcnow()
    token = create_access_token({"sub": str(usuario.id), "rol": usuario.rol})
    return Token(access_token=token)


@router.get("/me", response_model=UsuarioOut)
async def me(usuario=Depends(get_current_user)):
    return usuario


@router.post("/usuarios", response_model=UsuarioOut, status_code=201,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))])
async def crear_usuario(data: UsuarioCreate, db: AsyncSession = Depends(get_db)):
    existe = await db.execute(
        select(Usuario).where((Usuario.username == data.username) | (Usuario.email == data.email))
    )
    if existe.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "Username o email ya registrado")

    usuario = Usuario(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password),
        rol=data.rol,
        id_empleado=data.id_empleado,
    )
    db.add(usuario)
    await db.flush()
    await db.refresh(usuario)
    return usuario
