# Windows PowerShell Launcher for RAG-Graph
# Starts both FastAPI Backend (port 8000) and Vite Frontend (port 5173)

$RootPath = Split-Path -Parent $PSScriptRoot
Set-Location $RootPath

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Starting RAG-Graph Development Servers" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check if .venv exists
if (-not (Test-Path "$RootPath\.venv\Scripts\python.exe")) {
    Write-Host "[ERROR] Python virtual environment not found in $RootPath\.venv" -ForegroundColor Red
    Write-Host "Please create it and install requirements.txt first:" -ForegroundColor Yellow
    Write-Host "  python -m venv .venv"
    Write-Host "  .\.venv\Scripts\pip install -r requirements.txt"
    exit 1
}

# 1. Start Backend in a new window or background job
Write-Host "[1/2] Launching FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
$BackendJob = Start-Process -FilePath "$RootPath\.venv\Scripts\python.exe" -ArgumentList "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload" -PassThru -WindowStyle Normal

# Wait 2 seconds for backend to initialize
Start-Sleep -Seconds 2

# 2. Start Frontend
Write-Host "[2/2] Launching Vite Frontend on http://localhost:5173..." -ForegroundColor Green
Set-Location "$RootPath\frontend"
npm run dev
