import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent noisy Vite HMR websocket connection warnings or Socket.io connection closed exceptions
// from bubbling up and triggering unhandled rejections or visual error overlays in the preview.
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
      // Ignore inner checking errors
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
