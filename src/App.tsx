import { useState, useEffect } from "react";
import OBSOverlayView from "./components/OBSOverlayView";
import StreamerDashboard from "./components/StreamerDashboard";
import "./types";

export default function App() {
  const [isOverlayPath, setIsOverlayPath] = useState(false);

  // Detect if we're on the overlay path
  useEffect(() => {
    if (window.location.pathname === "/overlay") {
      setIsOverlayPath(true);
    }
  }, []);

  if (isOverlayPath) {
    return <OBSOverlayView />;
  }

  return <StreamerDashboard />;
}
