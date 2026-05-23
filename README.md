# Discord OBS Overlay Application

A Discord-powered OBS overlay that turns Discord messages into overlay alerts. It supports both prefix commands (`!alert`) and slash commands (`/alert`).

## Features

- Real-time alert broadcasting to the OBS overlay via Socket.IO
- Prefix command mode: `!alert`, `!help`, `!status`
- Slash command mode: `/alert`, `/help`, `/status`
- Media handling for images, videos, and URLs
- Banned words filtering
- Log history for approved / blocked / censored alerts

## Project Structure

- `src/`: React frontend
- `server/`: Node.js backend
- `server.ts`: Express + Socket.IO bootstrap
- `register-commands.ts`: registers global slash commands
- `settings.json`: stores the Discord token and channel configured in the dashboard

## Prerequisites

- Node.js 18+
- npm
- A Discord bot token
- A Discord application ID
- A configured Discord channel ID (via the dashboard)

## Installation Universelle

Pour une installation simplifiée sur votre système, utilisez les scripts d'installation fournis.

### macOS & Linux

1.  Ouvrez un terminal.
2.  Accédez au répertoire du projet.
3.  Rendez le script d'installation exécutable :
    ```bash
    chmod +x install.sh
    ```
4.  Exécutez le script d'installation :
    ```bash
    ./install.sh
    ```

### Windows

1.  Ouvrez l'invite de commandes ou PowerShell.
2.  Accédez au répertoire du projet.
3.  Exécutez le script d'installation :
    ```cmd
    install.bat
    ```

Ces scripts installeront les dépendances nécessaires et construiront l'application.

## Exécuter l'application

Pour démarrer l'application après l'installation :

### macOS & Linux

```bash
chmod +x start.sh
./start.sh
```

### Windows

```cmd
start.bat
```

L'interface utilisateur sera disponible à `http://localhost:3000/`.

## Configure the Discord bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a new application.
3. Open **Bot** and add the bot.
4. Copy the bot token.
5. Open **OAuth2 > URL Generator**.
6. Select **bot**.
7. Grant permissions for **View Channels**, **Read Messages**, and **Send Messages**.
8. Copy the generated invite URL and add the bot to your Discord server.

## Configure the bot inside the dashboard

1. Start the app with `npm run dev`.
2. Open `http://localhost:3000/`.
3. Paste your Discord bot token in the dashboard.
4. Paste the target channel ID.
5. Save the settings.

The server will reconnect automatically using the saved token and channel.

## Quick start

1. Make sure your bot token and application ID are in `.env.local`:

```env
DISCORD_TOKEN=your_discord_bot_token
APPLICATION_ID=your_discord_application_id
```

2. Install dependencies:

```bash
npm install
```

3. Register the global slash commands:

```bash
npm run register-commands
```

4. Start the app:

```bash
npm run dev
```

5. Open `http://localhost:3000/` and configure the Discord token + channel in the dashboard if needed.

6. In Discord, use:

```text
/alert
/help
/status
```

If the registration fails, check that `DISCORD_TOKEN` and `APPLICATION_ID` are present.

## Command usage

### Prefix commands

```text
!alert Nice stream message
!help
!status
```

### Slash commands

```text
/alert message: Nice stream message
/help
/status
```

## OBS setup

1. Start the app.
2. In OBS, add a **Browser Source**.
3. Set the URL to `http://localhost:3000/`.
4. Enable **Refresh browser when scene becomes active**.
5. Resize and position the source as needed.

## Build for production

```bash
npm run build
npm run start
```

## Notes

- Slash command registration uses the values from `.env.local`.
- The app runtime uses the token stored in `settings.json` from the dashboard.
- The bot keeps both command styles available, so you can migrate gradually.
