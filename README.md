# Discord OBS Overlay Application

This project is a Discord OBS overlay application designed to display real-time alerts and media within an OBS stream. It features a React (Vite) frontend and a Node.js (Express) backend, with integrations for Google Gemini API and Discord.js.

## Features

- Real-time display of Discord and simulated alerts in OBS.
- Dynamic media playback and animated alert styles.
- Automatic vertical sizing of the OBS browser source for optimal content display.
- Keyboard shortcut support for skipping/stopping active alerts.
- Media look-ahead preloading engine for smooth transitions.

## Technologies Used

### Frontend

- **React:** A JavaScript library for building user interfaces.
- **Vite:** A fast frontend build tool.
- **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
- **Lucide React:** A collection of beautiful hand-crafted SVG icons.
- **Motion:** A production-ready animation library for React.
- **React Player:** A React component for playing a variety of URLs, including file paths, YouTube, Facebook, Twitch, SoundCloud, Streamable, Vimeo, Wistia, DailyMotion, Vidyard, and Custom.
- **Socket.IO Client:** Client-side library for real-time bidirectional event-based communication.

### Backend

- **Node.js:** A JavaScript runtime built on Chrome's V8 JavaScript engine.
- **Express:** A fast, unopinionated, minimalist web framework for Node.js.
- **Socket.IO:** Server-side library for real-time bidirectional event-based communication.
- **Discord.js:** A powerful Node.js module for interacting with the Discord API.
- **Google Gemini API:** For integrating AI capabilities.
- **Dotenv:** Loads environment variables from a `.env` file.
- **Link Preview JS:** A library to get the link preview data from a URL.

### Development Tools

- **TypeScript:** A superset of JavaScript that adds static types.
- **tsx:** A TypeScript execution environment for Node.js.
- **esbuild:** An extremely fast JavaScript bundler and minifier.
- **Autoprefixer:** PostCSS plugin to parse CSS and add vendor prefixes to CSS rules.

## Project Structure

- `src/`: Contains the React frontend source code.
- `server/`: Contains the Node.js Express backend source code.
- `server.ts`: The main entry point for the backend server.
- `index.html`: The entry point for the frontend application.
- `package.json`: Project dependencies and scripts.
- `.env.local`: Environment variables (e.g., `GEMINI_API_KEY`).

## Setup and Development

1.  **Install Dependencies:**

    ```bash
    npm install
    ```

2.  **Environment Variables:**
    Create a `.env.local` file at the project root and set your `GEMINI_API_KEY`:

    ```
    GEMINI_API_KEY=YOUR_GEMINI_API_KEY
    ```

3.  **Run in Development Mode:**
    ```bash
    npm run dev
    ```
    This command typically runs the backend using `tsx server.ts` and the frontend via Vite.

## Build and Deployment

1.  **Build Application:**

    ```bash
    npm run build
    ```

    This compiles both the frontend (Vite) and backend (`esbuild`).

2.  **Start Production Server:**
    ```bash
    npm run start
    ```
    After building, this command runs the compiled backend server (`node dist/server.cjs`).
