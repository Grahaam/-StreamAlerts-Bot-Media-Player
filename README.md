# StreamAlerts Hub

StreamAlerts Hub est une application conçue pour les streamers, permettant de récupérer des médias (vidéos, images, liens) depuis un salon Discord et de les afficher automatiquement en direct sur votre stream via OBS.

## 🚀 Prérequis

Avant de commencer, assurez-vous d'avoir installé les logiciels suivants sur votre machine :
- **[Node.js](https://nodejs.org/fr/)** (version 18 ou supérieure recommandée)
- Assurez-vous que la commande `npm` est disponible dans votre terminal/invite de commande.

## 📦 Installation

L'application est fournie avec des scripts automatisés pour simplifier l'installation.

### 🪟 Pour Windows
1. Double-cliquez sur le fichier `install.bat`.
2. Attendez la fin du processus d'installation. Cela va télécharger toutes les dépendances requises et préparer l'application.

### 🍎 Pour macOS / 🐧 Linux
1. Ouvrez un terminal dans le dossier du projet.
2. Rendez le script d'installation exécutable (si nécessaire) : `chmod +x install.sh`
3. Exécutez le script : `./install.sh`

*(Alternativement, vous pouvez simplement ouvrir un terminal dans le dossier et exécuter `npm install` puis `npm run build` manuellement).*

## 🎮 Lancement de l'application

Une fois l'installation terminée, vous pouvez démarrer l'application.

### 🪟 Pour Windows
- Double-cliquez sur `start.bat`.

### 🍎 Pour macOS / 🐧 Linux
- Exécutez `./start.sh` dans votre terminal.
- *(Ou lancez manuellement `npm start`).*

Le serveur démarrera localement. Vous pourrez ensuite accéder au Dashboard du streamer depuis votre navigateur (généralement à l'adresse **http://localhost:3000** - l'URL exacte sera affichée dans le terminal).

## ⚙️ Configuration initiale (Tutoriel)

Lors de votre première connexion au Dashboard, un **tutoriel interactif** s'affichera pour vous guider. Voici les étapes principales :

1. **Liaison Discord** : Allez dans l'onglet des paramètres Discord du Dashboard. Renseignez l'ID de votre salon textuel et le Token de votre Bot Discord.
2. **OBS Studio** : Dans la section "Lien pour OBS" du Dashboard, copiez l'URL fournie.
3. Allez dans OBS, ajoutez une nouvelle **"Source Navigateur" (Browser Source)**.
4. Collez l'URL.
5. Ajustez la taille (ex: 1920x1080) selon la résolution de l'intégration souhaitée.
6. **Important** : Cochez la case *"Désactiver la source quand elle n'est pas visible (Shutdown source when not visible)"* ou une option similaire pour la gestion des caches.

## 🧪 Tester l'overlay

Vous pouvez utiliser le bouton "Simuler" en bas de l'onglet du panneau de liaison OBS pour envoyer une fausse alerte sur votre overlay et vérifier que le rendu correspond bien à vos attentes sur OBS !

---
*Développé pour les streamers, avec amour 💜*
