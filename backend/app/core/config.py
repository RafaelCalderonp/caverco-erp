from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    ENVIRONMENT: str = "development"
    ENCRYPTION_KEY: Optional[str] = None     # Fernet key (urlsafe-base64, 32 bytes) para credenciales cifradas. Si no se define, se deriva de SECRET_KEY (solo recomendado en dev).

    class Config:
        env_file = ".env"

settings = Settings()
