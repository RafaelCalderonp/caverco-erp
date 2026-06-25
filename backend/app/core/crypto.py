import base64
import hashlib

from cryptography.fernet import Fernet

from .config import settings


def _resolve_key() -> bytes:
    if settings.ENCRYPTION_KEY:
        return settings.ENCRYPTION_KEY.encode()
    # Fallback determinístico desde SECRET_KEY: solo aceptable en desarrollo.
    # En producción se debe definir ENCRYPTION_KEY explícitamente (ej. Fernet.generate_key()).
    digest = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return base64.urlsafe_b64encode(digest)


_fernet = Fernet(_resolve_key())


def encrypt(value: str) -> str:
    return _fernet.encrypt(value.encode()).decode()


def decrypt(token: str) -> str:
    return _fernet.decrypt(token.encode()).decode()


def mask(value: str) -> str:
    if len(value) <= 4:
        return "•" * len(value)
    return "•" * (len(value) - 4) + value[-4:]
