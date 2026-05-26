@echo off
setlocal

:: Check if Node.js is installed
node -v >nul 2>nul
if %errorlevel% equ 0 goto :node_installed

echo Node.js is not trouve. Installation en cours...
echo Telechargement de Node.js v20 (64-bit)...
powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi' -OutFile 'node_installer.msi'"
if exist node_installer.msi (
    echo Installation de Node.js (une fenetre d'autorisation administrateur peut s'ouvrir)...
    start /wait msiexec /i node_installer.msi
    del node_installer.msi
    echo.
    echo ========================================================
    echo Node.js a ete installe ! VEUILLEZ FERMER CETTE FENETRE
    echo RELANCER CE SCRIPT (install.bat) POUR CONTINUER.
    echo ========================================================
    pause
    exit /b
) else (
    echo Echec du telechargement de Node.js. Veuillez l'installer manuellement depuis https://nodejs.org/
    pause
    exit /b
)

:node_installed
echo Node.js est installe :
node -v
echo.
echo Installation des dependances de StreamAlerts Hub...
call npm install
echo.
echo Compilation de l'application...
call npm run build
echo.
echo Installation terminee ! Vous pouvez maintenant lancer start.bat
pause
