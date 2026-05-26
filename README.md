# StreamAlerts Hub

StreamAlerts Hub is a direct bridge between Discord and OBS. It captures media (videos, images, links) from a specific Discord channel and displays them as alerts on your stream in real-time.

---

## ⚡️ Quick Start

### 1. Prerequisites
- **[Node.js](https://nodejs.org/)** (v18 or higher)
- **Discord Bot Token**: You'll need a bot with `GuildMessages` and `MessageContent` intents enabled.
- **OBS Studio**: To display the overlay.

### 2. Setup
Run the installer for your operating system:

- **Windows**: Double-click `install.bat`
- **macOS / Linux**: Run `./install.sh` (you might need `chmod +x install.sh` first)

*Manual setup: `npm install && npm run build`*

### 3. Configuration
1. Create a `.env.local` file in the root directory (you can copy `.env.local` if it exists and fill in your details):
   ```env
   DISCORD_TOKEN=your_bot_token_here
   APPLICATION_ID=your_client_id_here
   ```
2. Run the application:
   - **Windows**: Double-click `start.bat`
   - **macOS / Linux**: Run `./start.sh`
   - *Manual: `npm run start` (production) or `npm run dev` (development)*

3. Open your browser and go to **http://localhost:3000**.

### 4. OBS Integration
1. In the **StreamAlerts Hub** dashboard, go to the **Overlay OBS** section and copy the unique URL.
2. In **OBS Studio**, add a new **Browser Source**.
3. Paste the URL, set the resolution to **1920x1080** (or your stream's resolution), and check "Shutdown source when not visible" and "Refresh browser when scene becomes active" if desired.
4. **Test it**: Use the "Trigger Test Alert" button in the dashboard to verify the connection.

---

## ⚙️ How it Works
- The application monitors a Discord channel for new messages containing media or links.
- Supported media: Images, Videos (Direct links, YouTube, TikTok, Instagram, etc.), and Link Previews.
- Alerts are queued and displayed one by one on the OBS overlay.
- You can manage the queue, skip alerts, or clear history from the dashboard.

---

## 🇫🇷 Note pour les utilisateurs francophones
L'interface est disponible en français. Une fois le serveur lancé, vous retrouverez toutes les instructions directement dans le tableau de bord.
