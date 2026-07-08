#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "=== Caverco ERP: iniciando entorno ==="

# 1. Iniciar PostgreSQL
pg_ctlcluster 16 main status > /dev/null 2>&1 || pg_ctlcluster 16 main start
sleep 2

# 2. Ejecutar migraciones pendientes (idempotente con IF NOT EXISTS)
PGPASSWORD=postgres psql -h localhost -U postgres -d caverco_erp \
  -f "$CLAUDE_PROJECT_DIR/database/27_contrato_colacion_movilizacion.sql" \
  > /dev/null 2>&1 || true

# 3. Instalar dependencias Python si faltan
cd "$CLAUDE_PROJECT_DIR/backend"
if [ ! -d venv ]; then
  python3 -m venv venv
fi
venv/bin/pip install -q -r requirements.txt

# 4. Iniciar backend en background
pkill -f "uvicorn app.main:app" 2>/dev/null || true
sleep 1
nohup venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 \
  > /tmp/uvicorn.log 2>&1 &
sleep 3

# 5. Instalar dependencias frontend si faltan
cd "$CLAUDE_PROJECT_DIR/frontend"
if [ ! -d node_modules ]; then
  npm install --silent
fi

echo "=== Entorno listo ==="
