#!/bin/bash

# Definition de la fonction d'installation locale de Node selon l'OS
install_node() {
    echo "Node.js n'est pas installe. Tentative d'installation automatique..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "OS detecte: macOS"
        if command -v brew &> /dev/null; then
            echo "Installation via Homebrew..."
            brew install node
        else
            echo "Homebrew non trouve. Telechargement de l'installateur macOS..."
            curl -o node-installer.pkg https://nodejs.org/dist/v20.11.1/node-v20.11.1.pkg
            sudo installer -pkg node-installer.pkg -target /
            rm node-installer.pkg
        fi
    elif command -v apt-get &> /dev/null; then
        echo "OS detecte: Debian/Ubuntu (Linux)"
        echo "Ajout du depot NodeSource et installation..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v dnf &> /dev/null || command -v yum &> /dev/null; then
        echo "OS detecte: Fedora/RHEL/CentOS (Linux)"
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo yum install -y nodejs
    else
        echo "Impossible de detecter votre gestionnaire de paquets automatiquement."
        echo "Veuillez installer Node.js manuellement depuis https://nodejs.org/"
        exit 1
    fi
    
    echo "Installation de Node.js terminee."
    
    if ! command -v node &> /dev/null; then
        echo "Veuillez redemarrer votre terminal puis relancer ./install.sh pour continuer."
        exit 0
    fi
}

# Verification de la presence de node
if ! command -v node &> /dev/null; then
    install_node
fi

echo "Version de Node installée :"
node -v
echo ""

echo "Installation des dependances de StreamAlerts Hub..."
npm install

echo "Compilation de l'application..."
npm run build

echo "Installation terminee ! Vous pouvez maintenant lancer ./start.sh"
