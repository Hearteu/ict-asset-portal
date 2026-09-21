@echo off
title Remove DPWH ICT Portal Autostart
cd /d "%~dp0"

echo Removing DPWH ICT Portal from Windows Autostart...

:: 1. Delete scheduled task
schtasks /delete /tn "DPWH_ICT_Asset_Portal" /f >nul 2>&1

:: 2. Remove Startup shortcut if present
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\DPWH_ICT_Portal.lnk" >nul 2>&1

:: 3. Stop running server processes
call "Stop Portal.bat"

echo Autostart has been removed.
pause
