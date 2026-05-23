@echo off

REM Script d'installation pour Windows

echo "Démarrage de l'installation..."

REM Vérifie si Node.js est installé
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo "Node.js n'est pas installé. Veuillez l'installer pour continuer."
    echo "Visitez https://nodejs.org/ pour les instructions d'installation."
    exit /b 1
)

echo "Node.js est installé."

REM Installation des dépendances npm
echo "Installation des dépendances npm..."
npm install
if %errorlevel% neq 0 (
    echo "Erreur lors de l'installation des dépendances npm."
    exit /b 1
)

echo "Dépendances npm installées avec succès."

REM Construction de l'application
echo "Construction de l'application..."
npm run build
if %errorlevel% neq 0 (
    echo "Erreur lors de la construction de l'application."
    exit /b 1
)

echo "Application construite avec succès."

echo "Installation terminée. Vous pouvez maintenant exécuter l'application avec start.bat"
