@echo off
title DPWH ICT Portal - Persistent LAN Setup
cd /d "%~dp0"

echo ======================================================================
echo   DPWH ICT Portal - Network Broadcast and Persistent Autostart Setup
echo ======================================================================
echo.

:: 1. Check for Admin privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Requesting Administrator privileges to configure Windows Firewall...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

:: 2. Open Windows Firewall Port 8000
echo [*] Step 1: Configuring Windows Firewall for Port 8000...
netsh advfirewall firewall delete rule name="DPWH ICT Portal" >nul 2>&1
netsh advfirewall firewall add rule name="DPWH ICT Portal" dir=in action=allow protocol=TCP localport=8000 profile=any >nul
if %errorLevel% equ 0 (
    echo     [OK] Inbound Port 8000 allowed in Windows Firewall.
) else (
    echo     [WARNING] Could not set firewall rule. You may need to manually allow Port 8000.
)

:: 3. Register Persistent Windows Scheduled Task
echo.
echo [*] Step 2: Registering Persistent Autostart Background Task...
set "VBS_PATH=%~dp0Launch Silent (No Window).vbs"
schtasks /delete /tn "DPWH_ICT_Asset_Portal" /f >nul 2>&1
schtasks /create /tn "DPWH_ICT_Asset_Portal" /tr "wscript.exe \"%VBS_PATH%\"" /sc onlogon /rl highest /f >nul
if %errorLevel% equ 0 (
    echo     [OK] Windows Task 'DPWH_ICT_Asset_Portal' created successfully!
    echo     The portal will now automatically run silently in the background whenever Windows starts.
) else (
    echo     [WARNING] Could not create scheduled task. Falling back to Startup folder shortcut...
    powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut(\"$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\DPWH_ICT_Portal.lnk\"); $s.TargetPath = \"wscript.exe\"; $s.Arguments = '\"%VBS_PATH%\"'; $s.WorkingDirectory = \"%~dp0\"; $s.Save()"
    echo     [OK] Created shortcut in Windows Startup folder.
)

:: 4. Detect and display Local IP address
echo.
echo ======================================================================
echo   SETUP COMPLETE!
echo ======================================================================
echo.
powershell -Command "$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.254*' -and $_.IPAddress -notlike '172.*' } | Select-Object -First 1).IPAddress; Write-Host '  Host IP Address:' $ip -ForegroundColor Cyan; Write-Host '  Local PC Access:' 'http://127.0.0.1:8000' -ForegroundColor Green; Write-Host '  LAN Network Access:' ('http://' + $ip + ':8000') -ForegroundColor Yellow"
echo.
echo You can share the LAN Network Access link with any computer, phone,
echo or tablet connected to your local network or office Wi-Fi!
echo.
echo Starting the portal now in the background...
wscript.exe "%VBS_PATH%"
echo.
pause
