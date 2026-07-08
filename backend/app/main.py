import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.migrations import run_pending_migrations
from app.routers import auth, empleados, departamentos, licencias, liquidaciones, integraciones, contratos, catalogos, empresas, contabilidad, plan_cuentas, libro_diario, plantillas_contabilizacion, capacitaciones

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

@app.get("/")
def root():
    return {"app": "Caverco ERP", "modulo": "RRHH", "version": "1.0.0", "status": "ok"}

@app.get("/health")
def health():
    return {"status": "ok"}
