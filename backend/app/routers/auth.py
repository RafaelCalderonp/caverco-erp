from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    verify_password, hash_password, create_access_token,
    get_current_user, require_roles,
)
from app.models.rrhh import Usuario
from app.schemas.auth import Token, UsuarioOut, UsuarioCreate, CambiarPasswordIn

router = APIRouter(prefix="/auth", tags=["Autenticación"])

MAX_INTENTOS_FALLIDOS = 5
VENTANA_BLOQUEO = timedelta(minutes=15)
_intentos_fallidos: dict[str, list[datetime]] = {}


def _clave_rate_limit(request: Request, username: str) -> str:
    return f"{request.client.host if request.client else 'unknown'}:{username}"


def _bloqueado(clave: str) -> bool:
    ahora = datetime.utcnow()
    intentos = [t for t in _intentos_fallidos.get(clave, []) if ahora - t < VENTANA_BLOQUEO]
    _intentos_fallidos[clave] = intentos
    return len(intentos) >= MAX_INTENTOS_FALLIDOS


def _registrar_intento_fallido(clave: str) -> None:
    _intentos_fallidos.setdefault(clave, []).append(datetime.utcnow())


@router.post("/login", response_model=Token)
async def login(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    clave = _clave_rate_limit(request, form.username)
    if _bloqueado(clave):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Demasiados intentos fallidos. Intenta nuevamente en unos minutos.",
        )

    result = await db.execute(select(Usuario).where(Usuario.username == form.username))
    usuario = result.scalar_one_or_none()
    if not usuario or not usuario.activo or not verify_password(form.password, usuario.hashed_password):
        _registrar_intento_fallido(clave)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario o contraseña incorrectos")

    _intentos_fallidos.pop(clave, None)
    usuario.ultimo_login = datetime.utcnow()
    token = create_access_token({"sub": str(usuario.id), "rol": usuario.rol})
    return Token(access_token=token)


@router.get("/me", response_model=UsuarioOut)
async def me(usuario=Depends(get_current_user)):
    return usuario


@router.post("/password", status_code=204)
async def cambiar_password(
    data: CambiarPasswordIn,
    db: AsyncSession = Depends(get_db),
    usuario=Depends(get_current_user),
):
    if not verify_password(data.password_actual, usuario.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "La contraseña actual no es correcta")
    if len(data.password_nueva) < 8:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "La nueva contraseña debe tener al menos 8 caracteres")

    usuario.hashed_password = hash_password(data.password_nueva)
    await db.flush()


@router.post("/usuarios", response_model=UsuarioOut, status_code=201,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))])
async def crear_usuario(data: UsuarioCreate, db: AsyncSession = Depends(get_db),
                         solicitante=Depends(get_current_user)):
    if data.rol in ("SUPERADMIN", "ADMIN") and solicitante.rol != "SUPERADMIN":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo SUPERADMIN puede crear usuarios SUPERADMIN o ADMIN")

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
