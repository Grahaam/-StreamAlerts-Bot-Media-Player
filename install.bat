@echo off
setlocal

:: Check if Node.js is installed
node -v >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install it from https://nodejs.org/ first.
    pause
    exit /b
)

echo 📦 Installing dependencies...
call npm install

echo 🛠️ Building the app...
call npm run build

echo ✅ Done! Run start.bat to begin.
pause
