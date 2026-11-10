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


@app.get("/debug/contrato-periodo")
async def debug_contrato_periodo(periodo: str, id_empleado: int = None, rut: str = None):
    """Diagnóstico temporal: qué contrato resuelve _contrato_del_periodo
    para un empleado/periodo, y todos sus contratos. Acepta id_empleado o rut."""
    import asyncpg
    db_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(db_url)
    try:
        if rut and not id_empleado:
            fila = await conn.fetchrow("SELECT id FROM erp.empleados WHERE rut = $1", rut)
            if not fila:
                return {"error": f"No existe empleado con rut {rut}"}
            id_empleado = fila["id"]
        year, month = int(periodo[:4]), int(periodo[5:7])
        import calendar as _cal
        from datetime import date as _date
        fin_periodo = _date(year, month, _cal.monthrange(year, month)[1])
        inicio_periodo = _date(year, month, 1)
        emp = await conn.fetchrow(
            "SELECT id, nombres, apellido_paterno, rut, sueldo_base FROM erp.empleados WHERE id = $1", id_empleado
        )
        contratos = await conn.fetch(
            "SELECT id, numero_contrato, sueldo_bruto, fecha_inicio, fecha_termino_real, estado, id_centro_costo "
            "FROM erp.contratos WHERE id_empleado = $1 ORDER BY fecha_inicio DESC", id_empleado
        )
        resuelto = await conn.fetchrow(
            "SELECT id, numero_contrato, sueldo_bruto, fecha_inicio, fecha_termino_real, estado "
            "FROM erp.contratos WHERE id_empleado = $1 AND fecha_inicio <= $2 "
            "AND (fecha_termino_real IS NULL OR fecha_termino_real >= $3) "
            "ORDER BY fecha_inicio DESC LIMIT 1",
            id_empleado, fin_periodo, inicio_periodo,
        )
        return {
            "empleado": dict(emp) if emp else None,
            "contratos": [dict(c) for c in contratos],
            "resuelto_por_contrato_del_periodo": dict(resuelto) if resuelto else None,
        }
    finally:
        await conn.close()
