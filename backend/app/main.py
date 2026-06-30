import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.routers import auth, empleados, departamentos, licencias, liquidaciones, integraciones, contratos, catalogos, empresas, contabilidad, plan_cuentas

logger = logging.getLogger("uvicorn.error")

app = FastAPI(
    title="Caverco ERP — API",
    description="API REST para el módulo de Recursos Humanos",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
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

@app.get("/")
def root():
    return {"app": "Caverco ERP", "modulo": "RRHH", "version": "1.0.0", "status": "ok"}

@app.get("/health")
def health():
    return {"status": "ok"}
