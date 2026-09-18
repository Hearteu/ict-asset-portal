@echo off
title Stop ICT Portal
echo Stopping any running ICT Portal server processes...
taskkill /F /IM python.exe /T 2>nul
echo Done! The portal server has been stopped.
timeout /t 3
