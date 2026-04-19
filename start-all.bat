@echo off
echo ======================================================
echo           🚀 Launching CuraLink Full-Stack 
echo ======================================================
echo.

:: 1. Start AI Engine (Python FastAPI)
echo [1/3] Starting AI Engine (Port 8000)...
start "CuraLink: AI Engine" cmd /k "npm run start:ai"

:: 2. Start Backend (Express API)
echo [2/3] Starting Backend API (Port 5000)...
start "CuraLink: Backend" cmd /k "npm run dev:backend"

:: 3. Start Frontend (Vite/React)
echo [3/3] Starting Frontend (Port 5173)...
start "CuraLink: Frontend" cmd /k "npm run dev:frontend"

echo.
echo ======================================================
echo ✅ All services are launching in separate windows!
echo 🌐 App: http://localhost:5173
echo ======================================================
echo.
pause
