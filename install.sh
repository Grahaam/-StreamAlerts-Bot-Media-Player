#!/bin/bash

# Script d'installation pour Linux et macOS

echo "Démarrage de l'installation..."

# Vérifie si Node.js est installé
if ! command -v node &> /dev/null
then
    echo "Node.js n'est pas installé. Veuillez l'installer pour continuer."
    echo "Visitez https://nodejs.org/ pour les instructions d'installation."
    exit 1
fi

echo "Node.js est installé."

if ! command -v node &> /dev/null
then
    echo "Node non installé. Tentative d'installation..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y nodejs npm
        elif command -v yum &> /dev/null; then
            sudo yum install -y nodejs npm
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install node
        else
            echo "Homebrew n'est pas installé. Veuillez installer Homebrew pour continuer."
            exit 1
        fi
    fi
fi

if ! command -v node &> /dev/null
then
    echo "Node.js n'a pas pu être installé automatiquement. Veuillez l'installer manuellement et réexécuter ce script."
    exit 1
fi
echo "Node.js est installé."
# Enregistre commandes slash
echo "Enregistrement des commandes slash..."
npx run register-commands.ts
if [ $? -ne 0 ]; then
    echo "Erreur enregistrement commandes."
    exit 1
fi


# Installation des dépendances npm
echo "Installation des dépendances npm..."
npm install
if [ $? -ne 0 ]; then
    echo "Erreur lors de l'installation des dépendances npm."
    exit 1
fi

echo "Dépendances npm installées avec succès."

# Construction de l'application
echo "Construction de l'application..."
npm run build
if [ $? -ne 0 ]; then
    echo "Erreur lors de la construction de l'application."
    exit 1
fi

echo "Application construite avec succès."

echo "Installation terminée. Vous pouvez maintenant exécuter l'application avec ./start.sh"
