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
