## Instructions for AI Agents

This project is a Discord OBS overlay application built with React (Vite) for the frontend and Node.js (Express) for the backend. It integrates with Discord.js to monitor channels and Socket.IO for real-time communication.

### Project Structure

- `src/`: Contains the React frontend source code (Vite + Tailwind CSS).
  - `components/`: UI components like `OBSOverlayView.tsx` and `StreamerDashboard.tsx`.
- `server/`: Contains the Node.js Express backend logic.
  - `discordBotManager.ts`: Handles Discord bot connection and message events.
  - `mediaParser.ts`: Logic for extracting media URLs (YouTube, TikTok, etc.).
  - `settingsManager.ts`: Manages persistence of application settings.
  - `logManager.ts`: Handles application logging.
- `server.ts`: The main entry point for the backend server. It serves the Vite frontend in development and static files in production.
- `register-commands.ts`: Script to register Discord slash commands.
- `index.html`: The entry point for the frontend application.

### Setup and Development

1.  **Install Dependencies:** Run `npm install` to install all necessary project dependencies.
2.  **Environment Variables:** Create a `.env.local` file at the project root with `DISCORD_TOKEN` and `APPLICATION_ID`.
3.  **Run in Development Mode:** Use `npm run dev` to start the application in development mode. This runs the backend using `tsx server.ts` which also proxies Vite.

### Build and Deployment

1.  **Build Application:** Run `npm run build`. This runs `vite build` for the frontend and `esbuild` for the backend.
2.  **Start Production Server:** After building, use `npm run start` to run the compiled backend server (`node dist/server.cjs`).

### Key Technologies

- **Frontend:** React 19, Vite, Tailwind CSS 4, Framer Motion
- **Backend:** Node.js, Express, Socket.IO, Discord.js, esbuild, tsx
- **Testing:** Playwright

### Further Documentation

- For detailed setup instructions, refer to the project's [README.md](README.md).
- For package specifics, see [package.json](package.json).
