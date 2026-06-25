# Caverco ERP — Backend

## Stack
- **Python 3.11+** + **FastAPI** + **SQLAlchemy 2 async** + **PostgreSQL**

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # editar con tus credenciales
```

## Levantar servidor

```bash
uvicorn app.main:app --reload --port 8000
```

## Documentación interactiva
- Swagger UI: http://localhost:8000/docs
- ReDoc:       http://localhost:8000/redoc

## Endpoints principales (RRHH)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | /api/v1/empleados | Listar empleados |
| POST   | /api/v1/empleados | Crear empleado |
| GET    | /api/v1/empleados/{id} | Detalle empleado |
| PATCH  | /api/v1/empleados/{id} | Actualizar empleado |
| DELETE | /api/v1/empleados/{id} | Desactivar empleado |
| GET    | /api/v1/empleados/stats | Estadísticas |
| GET    | /api/v1/departamentos | Listar departamentos |
| POST   | /api/v1/departamentos | Crear departamento |
| GET    | /api/v1/empleados/{id}/licencias | Licencias de empleado |
| POST   | /api/v1/empleados/{id}/licencias | Crear licencia |
