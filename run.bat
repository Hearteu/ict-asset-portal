@echo off
title ICT Asset Inventory & Job Sheet Portal (Django)
cd /d "%~dp0"

echo ========================================================
echo  Starting ICT Asset Inventory & Job Sheet Portal...
echo ========================================================

:: Check virtual environment
if not exist "venv\Scripts\python.exe" (
    echo Creating virtual environment and installing dependencies...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    python manage.py migrate
    python manage.py seed_data
)

:: Automatically open the portal in your default browser (Chrome, Edge, etc.)
echo Opening web browser to http://127.0.0.1:8000 ...
start http://127.0.0.1:8000

:: Start Django server
echo Starting Django Web Server on port 8000...
echo (You can close this window anytime to stop the server)
echo ========================================================
venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
pause
