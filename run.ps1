# Run ICT Asset Inventory & Job Sheet Portal
Set-Location -Path $PSScriptRoot

if (-Not (Test-Path "venv")) {
    Write-Host "Setting up Python virtual environment..." -ForegroundColor Cyan
    python -m venv venv
    .\venv\Scripts\pip install -r requirements.txt
}

Write-Host "Launching ICT Portal on http://127.0.0.1:5000..." -ForegroundColor Green
.\venv\Scripts\python -m app.main
