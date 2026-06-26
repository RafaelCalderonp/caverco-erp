from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional, List

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    ENVIRONMENT: str = "development"
    ENCRYPTION_KEY: Optional[str] = None     # Fernet key (urlsafe-base64, 32 bytes) para credenciales cifradas. Si no se define, se deriva de SECRET_KEY (solo recomendado en dev).
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"  # Lista separada por comas de orígenes permitidos (frontend en producción).

    class Config:
        env_file = ".env"

    @field_validator("DATABASE_URL")
    @classmethod
    def _usar_driver_asyncpg(cls, v: str) -> str:
        # Render (y otros proveedores) entregan "postgresql://", pero el motor async requiere "postgresql+asyncpg://".
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @property
    def cors_origins_list(self) -> List[str]:
        return [origen.strip() for origen in self.CORS_ORIGINS.split(",") if origen.strip()]

settings = Settings()
