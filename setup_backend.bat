@echo off
echo ================================================
echo  CAVERCO ERP — Setup Backend
echo ================================================
echo.

cd /d "%~dp0backend"

echo [1/4] Creando entorno virtual Python...
python -m venv venv
call venv\Scripts\activate.bat

echo [2/4] Instalando dependencias...
pip install -r requirements.txt --quiet

echo [3/4] Configurando .env...
if not exist .env (
    copy .env.example .env
    echo IMPORTANTE: Edita backend\.env con tus credenciales de PostgreSQL
)

echo [4/4] Listo. Para iniciar el servidor ejecuta:
echo   cd backend
echo   venv\Scripts\activate
echo   uvicorn app.main:app --reload --port 8000
echo.
pause
