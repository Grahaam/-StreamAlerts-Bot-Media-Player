@echo off
setlocal

:: Find the process ID listening on port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    set PID=%%a
)

if "%PID%"=="" (
    echo No server is currently running on port 3000. All quiet on the western front!
) else (
    echo Stopping the server on port 3000 (PID: %PID%)...
    taskkill /F /PID %PID%
    echo Server stopped. Have a nice day!
)

endlocal
