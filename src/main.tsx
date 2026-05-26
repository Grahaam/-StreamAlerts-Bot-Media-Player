import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// silence noisy vite/socket.io connection errors in the browser
if (typeof window !== "undefined") {
  const suppressThemes = [
    "websocket",
    "[vite]",
    "failed to connect to websocket",
    "websocket closed",
    "socket.io",
    "unhandled rejection"
  ];

  const globalExceptionHandler = (event: ErrorEvent | PromiseRejectionEvent) => {
    try {
      const msg = "message" in event 
        ? event.message 
        : (event.reason && (event.reason.message || String(event.reason))) || "";
      
      const lower = String(msg).toLowerCase();
      const isBenign = suppressThemes.some(theme => lower.includes(theme));
      
      if (isBenign) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
    } catch (_) {
      // ignore
    }
  };

  window.addEventListener("error", globalExceptionHandler, true);
  window.addEventListener("unhandledrejection", globalExceptionHandler, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
