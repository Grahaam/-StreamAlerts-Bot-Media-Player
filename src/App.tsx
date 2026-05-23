import { useState, useEffect } from "react";
import OBSOverlayView from "./components/OBSOverlayView";
import StreamerDashboard from "./components/StreamerDashboard";
import "./types";

export default function App() {
  const [isOverlayPath, setIsOverlayPath] = useState(false);

  // Parse path at boot
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
