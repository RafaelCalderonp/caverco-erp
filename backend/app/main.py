from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, empleados, departamentos, licencias, liquidaciones, integraciones

app = FastAPI(
    title="Caverco ERP — API",
    description="API REST para el módulo de Recursos Humanos",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,          prefix="/api/v1")
app.include_router(empleados.router,     prefix="/api/v1")
app.include_router(departamentos.router, prefix="/api/v1")
app.include_router(licencias.router,     prefix="/api/v1")
app.include_router(liquidaciones.router,  prefix="/api/v1")
app.include_router(integraciones.router,  prefix="/api/v1")

@app.get("/")
def root():
    return {"app": "Caverco ERP", "modulo": "RRHH", "version": "1.0.0", "status": "ok"}

@app.get("/health")
def health():
    return {"status": "ok"}
