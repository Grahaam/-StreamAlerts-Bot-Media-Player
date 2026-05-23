## Instructions for AI Agents

This project is a Discord OBS overlay application built with React (Vite) for the frontend and Node.js (Express) for the backend. It integrates with Discord.js.

### Project Structure

- `src/`: Contains the React frontend source code.
- `server/`: Contains the Node.js Express backend source code.
- `server.ts`: The main entry point for the backend server.
- `index.html`: The entry point for the frontend application.

### Setup and Development

1.  **Install Dependencies:** Run `npm install` to install all necessary project dependencies.
2.  **Environment Variables:** Create a `.env.local` file at the project root.
3.  **Run in Development Mode:** Use `npm run dev` to start the application in development mode. This typically runs the backend using `tsx server.ts` and the frontend via Vite.

### Build and Deployment

1.  **Build Application:** Run `npm run build` to compile both the frontend (Vite) and backend (`esbuild`).
2.  **Start Production Server:** After building, use `npm run start` to run the compiled backend server (`node dist/server.cjs`).

### Key Technologies

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express, Socket.IO, Discord.js

### Further Documentation

- For detailed setup instructions, refer to the project's [README.md](README.md).
- For package specifics, see [package.json](package.json).
