"""
Ejecuta automáticamente los archivos SQL de /database/ al arrancar la app.
Usa la tabla erp.migrations_log para no repetir migraciones ya aplicadas.
Solo procesa archivos con nombre NN_*.sql (número al inicio).
"""
import logging
import os
import re
from pathlib import Path

logger = logging.getLogger("uvicorn.error")

MIGRATIONS_DIR = Path(__file__).parent.parent.parent.parent / "database"

ENSURE_LOG_TABLE = """
CREATE SCHEMA IF NOT EXISTS erp;
CREATE TABLE IF NOT EXISTS erp.migrations_log (
    nombre   VARCHAR(200) PRIMARY KEY,
    aplicada TIMESTAMPTZ  NOT NULL DEFAULT now()
);
"""


async def run_pending_migrations(conn) -> None:
    """Recibe una conexión asyncpg cruda y aplica migraciones pendientes."""
    await conn.execute(ENSURE_LOG_TABLE)

    aplicadas = {r["nombre"] for r in await conn.fetch("SELECT nombre FROM erp.migrations_log ORDER BY nombre")}

    # Solo ejecutar migraciones desde el 27 en adelante.
    # Las anteriores (schema, datos semilla, limpieza) ya están en producción
    # y contienen operaciones destructivas (TRUNCATE) que no deben repetirse.
    MIN_NUM = 27
    archivos = sorted(
        f for f in MIGRATIONS_DIR.glob("[0-9][0-9]_*.sql")
        if int(f.name[:2]) >= MIN_NUM
    )

    for archivo in archivos:
        nombre = archivo.name
        if nombre in aplicadas:
            continue
        sql = archivo.read_text(encoding="utf-8")
        try:
            await conn.execute(sql)
            await conn.execute(
                "INSERT INTO erp.migrations_log(nombre) VALUES($1) ON CONFLICT DO NOTHING",
                nombre,
            )
            logger.info("Migración aplicada: %s", nombre)
        except Exception as exc:
            logger.warning("Migración %s falló (puede ser inocua): %s", nombre, exc)
