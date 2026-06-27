from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rrhh import Empresa


async def siguiente_codigo(db: AsyncSession, id_empresa: int, entidad: str, ancho: int = 4) -> str:
    """Genera un código correlativo atómico por empresa, ej: INST-EMP-0001."""
    empresa = await db.get(Empresa, id_empresa)
    prefijo = (empresa.prefijo if empresa and empresa.prefijo else "GEN")

    result = await db.execute(
        text(
            """
            INSERT INTO erp.contadores (id_empresa, entidad, ultimo_numero)
            VALUES (:id_empresa, :entidad, 1)
            ON CONFLICT (id_empresa, entidad)
            DO UPDATE SET ultimo_numero = erp.contadores.ultimo_numero + 1
            RETURNING ultimo_numero
            """
        ),
        {"id_empresa": id_empresa, "entidad": entidad},
    )
    numero = result.scalar_one()
    return f"{prefijo}-{str(numero).zfill(ancho)}"
