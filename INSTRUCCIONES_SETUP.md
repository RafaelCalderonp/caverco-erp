# Caverco ERP — Guía de instalación completa

## Requisitos previos

| Software | Versión | Descarga |
|----------|---------|----------|
| Node.js  | 18+     | https://nodejs.org |
| Python   | 3.11+   | https://python.org |
| PostgreSQL | 15+  | https://www.postgresql.org/download/windows/ |

---

## PASO 1 — Instalar PostgreSQL

1. Descarga e instala PostgreSQL para Windows
2. Durante la instalación define una contraseña para el usuario `postgres` (anótala)
3. Deja el puerto en **5432** (default)

---

## PASO 2 — Crear la base de datos

Abre **pgAdmin** o la terminal `psql` y ejecuta:

```sql
-- En psql como superusuario:
psql -U postgres

-- Crear la BD:
CREATE DATABASE caverco_erp ENCODING 'UTF8';
\c caverco_erp
```

Luego ejecuta los scripts en orden:

```bash
psql -U postgres -d caverco_erp -f database\schema_v2_multiempresa.sql
psql -U postgres -d caverco_erp -f database\03_datos_prueba.sql
```

---

## PASO 3 — Configurar el Backend

### 3.1 Doble clic en `setup_backend.bat`

O manualmente:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3.2 Editar el archivo `.env`

Abre `backend\.env` (copia de `.env.example`) y edita:
```
DATABASE_URL=postgresql+asyncpg://postgres:TU_PASSWORD@localhost:5432/caverco_erp
SECRET_KEY=cualquier-cadena-larga-aleatoria-de-32-chars
APIGATEWAY_TOKEN=          ← opcional, para datos Previred en tiempo real
```

### 3.3 Levantar el backend

Doble clic en `iniciar_backend.bat` o:
```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

✅ Deberías ver: `Uvicorn running on http://127.0.0.1:8000`

Documentación API interactiva: **http://localhost:8000/docs**

---

## PASO 4 — Levantar el Frontend

Doble clic en `iniciar_frontend.bat` o:
```bash
cd frontend
npm install       ← solo la primera vez
npm run dev
```

✅ Abre en el navegador: **http://localhost:5173**

---

## Resumen de URLs

| Servicio | URL |
|----------|-----|
| Frontend (React) | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger docs | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

---

## Módulos disponibles

- `/dashboard` — Dashboard RRHH con estadísticas
- `/empleados` — Listado de trabajadores
- `/empleados/nuevo` — Formulario wizard 3 pasos
- `/liquidaciones` — Listado y cálculo de liquidaciones
- `/liquidaciones/{id}/boleta` — Boleta imprimible + PDF
- `/departamentos` — Departamentos

---

## Solución de problemas frecuentes

**Error de conexión a la BD:**
Verifica que PostgreSQL esté corriendo y que el password en `.env` sea correcto.

**`uvicorn: command not found`:**
Asegúrate de tener el venv activado (`venv\Scripts\activate`).

**Frontend muestra listas vacías:**
Verifica que el backend esté corriendo en el puerto 8000.

**Error de CORS:**
El backend ya tiene CORS habilitado para `localhost:5173`. No requiere configuración adicional.
