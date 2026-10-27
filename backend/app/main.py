import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.migrations import run_pending_migrations
from app.routers import auth, empleados, departamentos, licencias, liquidaciones, integraciones, contratos, catalogos, empresas, contabilidad, plan_cuentas, libro_diario, plantillas_contabilizacion, capacitaciones, remuneraciones_contabilidad, solicitudes_contrato, postulacion_publica

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncpg
    db_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    try:
        conn = await asyncpg.connect(db_url)
        await run_pending_migrations(conn)
        await conn.close()
    except Exception as exc:
        logger.error("Error ejecutando migraciones al inicio: %s", exc)
    yield

app = FastAPI(
    title="Caverco ERP — API",
    description="API REST para el módulo de Recursos Humanos",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

@app.exception_handler(Exception)
async def manejador_excepciones_no_controladas(request: Request, exc: Exception):
    logger.exception("Error no controlado en %s %s", request.method, request.url.path)
    respuesta = JSONResponse(status_code=500, content={"detail": "Error interno del servidor"})
    origen = request.headers.get("origin")
    if origen and origen in settings.cors_origins_list:
        respuesta.headers["Access-Control-Allow-Origin"] = origen
        respuesta.headers["Access-Control-Allow-Credentials"] = "true"
    return respuesta

app.include_router(auth.router,          prefix="/api/v1")
app.include_router(empleados.router,     prefix="/api/v1")
app.include_router(departamentos.router, prefix="/api/v1")
app.include_router(licencias.router,     prefix="/api/v1")
app.include_router(liquidaciones.router,  prefix="/api/v1")
app.include_router(integraciones.router,  prefix="/api/v1")
app.include_router(contratos.router,      prefix="/api/v1")
app.include_router(catalogos.router,      prefix="/api/v1")
app.include_router(empresas.router,       prefix="/api/v1")
app.include_router(contabilidad.router,   prefix="/api/v1")
app.include_router(plan_cuentas.router,   prefix="/api/v1")
app.include_router(libro_diario.router,                prefix="/api/v1")
app.include_router(plantillas_contabilizacion.router,  prefix="/api/v1")
app.include_router(capacitaciones.router,              prefix="/api/v1")
app.include_router(remuneraciones_contabilidad.router,  prefix="/api/v1")
app.include_router(solicitudes_contrato.router,          prefix="/api/v1")
app.include_router(postulacion_publica.router,           prefix="/api/v1")

@app.get("/")
def root():
    return {"app": "Caverco ERP", "modulo": "RRHH", "version": "1.0.0", "status": "ok"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/debug/procedimientos")
async def debug_procedimientos():
    """Endpoint temporal de diagnóstico: estado de las migraciones 58-62 y
    conteo de procedimientos de capacitación por empresa. Sin datos sensibles."""
    import asyncpg
    db_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(db_url)
    try:
        migraciones = await conn.fetch(
            "SELECT nombre, aplicada FROM erp.migrations_log WHERE nombre ~ '^(5[8-9]|6[0-2])_' ORDER BY nombre"
        )
        conteo_jd = await conn.fetchval(
            "SELECT count(*) FROM erp.procedimientos_capacitacion WHERE empresa_rut_filtro = '78.278.332-7'"
        )
        conteo_base = await conn.fetchval(
            "SELECT count(*) FROM erp.procedimientos_capacitacion WHERE empresa_rut_filtro IS NULL"
        )
        codigos_jd = await conn.fetch(
            "SELECT codigo, nombre FROM erp.procedimientos_capacitacion WHERE empresa_rut_filtro = '78.278.332-7' ORDER BY codigo"
        )
        return {
            "migraciones_58_a_62": [dict(r) for r in migraciones],
            "conteo_procedimientos_jd": conteo_jd,
            "conteo_procedimientos_base": conteo_base,
            "codigos_jd": [dict(r) for r in codigos_jd],
        }
    except Exception as exc:
        return {"error": str(exc)}
    finally:
        await conn.close()
