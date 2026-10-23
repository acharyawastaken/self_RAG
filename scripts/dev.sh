#!/usr/bin/env bash
# Development Launcher for RAG-Graph
# Starts both FastAPI Backend (port 8000) and Vite Frontend (port 5173)

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================="
echo " Starting RAG-Graph Development Servers"
echo "=========================================="

if [ -f "$DIR/.venv/bin/python" ]; then
    PYTHON_BIN="$DIR/.venv/bin/python"
elif [ -f "$DIR/.venv/Scripts/python.exe" ]; then
    PYTHON_BIN="$DIR/.venv/Scripts/python.exe"
else
    echo "[ERROR] Python virtual environment not found in .venv"
    exit 1
fi

# 1. Start Backend in background
echo "[1/2] Launching FastAPI Backend on http://localhost:8000..."
"$PYTHON_BIN" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

trap "kill $BACKEND_PID" EXIT

sleep 2

# 2. Start Frontend
echo "[2/2] Launching Vite Frontend on http://localhost:5173..."
cd "$DIR/frontend"
npm run dev
