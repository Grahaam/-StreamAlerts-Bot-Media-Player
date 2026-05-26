import { useState, useEffect, useRef } from "react";
import { 
  Bot, 
  Settings, 
  Activity, 
  Sliders, 
  Shield,
  ShieldAlert, 
  Sparkles, 
  Play, 
  Tv, 
  Copy, 
  Plus, 
  Trash2, 
  Loader2, 
  RefreshCw, 
  FileText, 
  X, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  User,
  Image as ImageIcon,
  Video as VideoIcon,
  Volume2,
  GripVertical
} from "lucide-react";
import { UIConfig, LogEntry, AlertPayload } from "../types";
import OBSOverlayView from "./OBSOverlayView";
import TutorialOverlay from "./TutorialOverlay";

export default function StreamerDashboard() {
  const [activeTab, setActiveTab] = useState<"credentials" | "styling" | "filters" | "moderation" | "simulator">("credentials");
  const [saveLoading, setSaveLoading] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [pendingQueue, setPendingQueue] = useState<AlertPayload[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    
    const newQueue = [...pendingQueue];
    const [movedItem] = newQueue.splice(draggedIndex, 1);
    newQueue.splice(targetIndex, 0, movedItem);
    setPendingQueue(newQueue);
    setDraggedIndex(null);
    
    try {
      await fetch("/api/queue/force-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue: newQueue }),
      });
    } catch (e) {
      console.error("Error updating queue:", e);
    }
  };

  const cancelAlertFromQueue = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch("/api/queue/remove-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (e) {
      console.error("Error updating queue:", e);
    }
  };

  useEffect(() => {
    const hasSeen = localStorage.getItem("hasSeenTutorial");
    if (!hasSeen) {
      setShowTutorial(true);
    }
  }, []);

  const finishTutorial = () => {
    localStorage.setItem("hasSeenTutorial", "true");
    setShowTutorial(false);
  };

  const [config, setConfig] = useState<UIConfig>({
    discordToken: "",
    channelId: "",
    alertDuration: 8000,
    mediaMaxSizeMB: 8,
    bannedWords: [],
    neonColor: "#6366f1",
    alertStyle: "neon",
    bannedWordsAction: "censor",
    stopAlertShortcut: "Escape",
    youtubeCookiesContent: "",
    cooldownSeconds: 0,
    blockLinks: false,
    blockNSFW: false,
  });

  const [botStatus, setBotStatus] = useState({
    status: "disconnected",
    botUser: "",
    errorMsg: "",
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [bannedWordInput, setBannedWordInput] = useState("");
  const [copyFeedback, setCopyFeedback] = useState(false);

  // State for custom simulation alerts
  const [simName, setSimName] = useState("Viewer_Lucky_Hype");
  const [simText, setSimText] = useState("Un clip sur le boss final ce soir ! GG");
  const [simType, setSimType] = useState<"image" | "video">("image");
  const [simMediaUrl, setSimMediaUrl] = useState("https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1280&auto=format&fit=crop");

  // Load settings and logs on startup
  // Function to fetch data from the API
  const fetchData = async (fetchSettings: boolean) => {
    try {
      if (fetchSettings) {
        const setRes = await fetch("/api/settings");
        const configData = await setRes.json();
        setConfig(configData);
      }

      const logRes = await fetch("/api/logs");
      const logData = await logRes.json();
      setLogs(logData);

      const botRes = await fetch("/api/bot-status");
      const botData = await botRes.json();
      setBotStatus(botData);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    }
  };

  useEffect(() => {
    fetchData(true); // Fetch settings and logs initially

    // Set up auto-refresh for logs and bot status
    const interval = setInterval(() => {
      fetchData(false); // Only fetch logs and bot status
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Global keyboard shortcut to skip alerts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't trigger if the user is typing in an input or textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      const configKey = config.stopAlertShortcut || "Escape";

      const matchesKey = 
        e.key.toLowerCase() === configKey.toLowerCase() ||
        e.code.toLowerCase() === configKey.toLowerCase() ||
        (configKey.toLowerCase() === "space" && e.key === " ") ||
        (configKey.toLowerCase() === "escape" && e.key === "Escape");

      if (matchesKey) {
        console.log("Global shortcut triggered: skipping alert.");
        e.preventDefault();
        try {
          await fetch("/api/skip-alert", { method: "POST" });
        } catch (err) {
          console.error("Failed to skip alert:", err);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [config.stopAlertShortcut]);

  const handleSaveSettings = async (overrideConfig: UIConfig = config) => {
    setSaveLoading(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(overrideConfig),
      });
      if (!response.ok) {
        let errorMsg = response.statusText;
        try {
            const errData = await response.json();
            if (errData.error) errorMsg = errData.error;
        } catch {
            const errText = await response.text();
            if (errText) errorMsg = errText.substring(0, 50);
        }
        throw new Error(`Failed to save: ${response.status} ${errorMsg}`);
      }
      const data = await response.json();
      if (data.success) {
        setConfig(data.settings);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleManualBotReconnect = async () => {
    try {
      setBotStatus((prev) => ({ ...prev, status: "connecting" }));
      const response = await fetch("/api/bot-reconnect", { method: "POST" });
      const data = await response.json();
      if (data.success) {
        fetchSettingsAndLogs();
      }
    } catch (err) {
      console.error("Error reconnecting bot:", err);
    }
  };

  // Add a new banned word
  const handleAddBannedWord = () => {
    if (!bannedWordInput || !bannedWordInput.trim()) return;
    const cleanWord = bannedWordInput.trim().toLowerCase();
    if (config.bannedWords.includes(cleanWord)) {
      setBannedWordInput("");
      return;
    }

    const updatedWords = [...config.bannedWords, cleanWord];
    const newConfig = { ...config, bannedWords: updatedWords };
    setConfig(newConfig);
    setBannedWordInput("");
    handleSaveSettings(newConfig);
  };

  const handleRemoveBannedWord = (word: string) => {
    const updatedWords = config.bannedWords.filter((w) => w !== word);
    const newConfig = { ...config, bannedWords: updatedWords };
    setConfig(newConfig);
    handleSaveSettings(newConfig);
  };

  const handleClearLogs = async () => {
    try {
      await fetch("/api/logs/clear", { method: "POST" });
      setLogs([]);
    } catch (err) {
      console.error("Error reconnecting bot:", err);
    }
  };

  // Trigger a test alert via API
  const handleTriggerTest = async (preset?: any) => {
    const payload = preset || {
      authorName: simName,
      text: simText,
      type: simType,
      mediaUrl: simMediaUrl,
      alertStyle: config.alertStyle,
      neonColor: config.neonColor,
      duration: config.alertDuration,
    };

    try {
      await fetch("/api/trigger-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      // Refresh logs after sending alert
      setTimeout(fetchSettingsAndLogs, 1000);
    } catch (err) {
      console.error("Error reconnecting bot:", err);
    }
  };

  const copyOverlayUrlToClipboard = () => {
    const url = window.location.origin + "/overlay";
    navigator.clipboard.writeText(url).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    });
  };

  // Pre-made test alerts
  const presets = [
    {
      label: "GIF Chat Rigolo",
      authorName: "Gamer_Mimi_😺",
      text: "Quand le stream commence enfin et que l'ambiance est au rendez-vous ! 🥂🎉",
      type: "image",
      mediaUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3hveXQ1djRycXUzZW03Nm1sdXQyYjBhMjBrd281ZnA1ODlhZm5kZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/L13yIu3sO2W50LDZKs/giphy.gif"
    },
    {
      label: "Vidéo Boucle Synthwave",
      authorName: "Neon_Pilot_88",
      text: "Ton stream de ce soir est très intéressant.",
      type: "video",
      mediaUrl: "https://assets.mixkit.co/videos/preview/mixkit-retro-futuristic-grid-background-with-laser-lights-42582-large.mp4"
    },
    {
      label: "Victoire de Team (Image Unsplash)",
      authorName: "Captain_Raid",
      text: "Top 1 mémorable ! On a roulé sur la game !! Incroyable travail d'équipe 🥇🥊",
      type: "image",
      mediaUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1280&auto=format&fit=crop"
    },
    {
      label: "Vibe Relax Calme",
      authorName: "ZenStreamer",
      text: "Un stream chill ce soir.",
      type: "image",
      mediaUrl: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1280&auto=format&fit=crop"
    }
  ];

  return (
    <div className="min-h-screen bg-[#050508] text-[#e0e0e6] flex flex-col font-sans selection:bg-indigo-600 selection:text-white relative overflow-hidden">
      {showTutorial && (
        <TutorialOverlay 
          onComplete={finishTutorial} 
          setActiveTab={setActiveTab} 
        />
      )}
      
      {/* Background glow effects */}
      <div className="absolute top-[15%] left-[75%] -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
      <div className="absolute top-[65%] left-[15%] -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-purple-600/5 blur-[130px] rounded-full pointer-events-none z-0"></div>

      {/* Navigation bar */}
      <nav className="min-h-16 border-b border-white/10 px-4 sm:px-8 py-3 sm:py-0 flex flex-col sm:flex-row items-center sm:justify-between gap-3 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)] transition hover:scale-110 duration-200">
            <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
          </div>
          <div>
            <span className="font-bold text-lg sm:text-xl tracking-tight text-white flex items-center gap-2">
              StreamAlerts
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 relative z-10 w-full sm:w-auto justify-between sm:justify-end">
          {/* Discord bot status */}
          <div className={`flex items-center gap-2 px-3 py-1 border rounded-full transition-all duration-300 text-xs font-semibold uppercase tracking-wider ${
            botStatus.status === "connected"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : botStatus.status === "connecting"
              ? "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse"
              : "bg-red-500/10 border-red-500/20 text-red-0"
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              botStatus.status === "connected"
                ? "bg-emerald-400 animate-pulse"
                : botStatus.status === "connecting"
                ? "bg-amber-400"
                : "bg-red-400"
            }`} />
            <span className="text-[10px] tracking-wide shrink-0">
              Bot {botStatus.status === "connected" ? "Connected" : botStatus.status === "connecting" ? "Connecting..." : "Disconnected"}
            </span>

            {botStatus.status !== "connected" && botStatus.status !== "connecting" && (
              <button
                onClick={handleManualBotReconnect}
                className="ml-1 p-0.5 hover:bg-white/10 rounded text-red-400 transition"
                title="Reconnect Discord bot"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main content area */}
      <main className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Settings, Styles, Moderation */}
        <section className="lg:col-span-7 flex flex-col gap-6" id="left-setup-panel">
          
          {/* Tab navigation */}
          <div className="bg-white/[0.02] border border-white/10 backdrop-blur-md rounded-2xl p-1.5 flex gap-1 items-center overflow-x-auto select-none relative z-10 w-full scrollbar-none">
            <button
              onClick={() => setActiveTab("credentials")}
              className={`flex items-center gap-1.5 xs:gap-2 px-3 xs:px-4 py-2 xs:py-2.5 rounded-xl text-xs xs:text-sm font-semibold transition-all duration-305 shrink-0 cursor-pointer ${
                activeTab === "credentials"
                  ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] border-t border-white/20"
                  : "text-white/45 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <Bot className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
              <span className="hidden xs:inline">Discord Connection</span>
              <span className="xs:hidden">Discord</span>
            </button>
            <button
              onClick={() => setActiveTab("styling")}
              className={`flex items-center gap-1.5 xs:gap-2 px-3 xs:px-4 py-2 xs:py-2.5 rounded-xl text-xs xs:text-sm font-semibold transition-all duration-305 shrink-0 cursor-pointer ${
                activeTab === "styling"
                  ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] border-t border-white/20"
                  : "text-white/45 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
              <span className="hidden xs:inline">Alerts & Styles</span>
              <span className="xs:hidden">Styles</span>
            </button>
            <button
              onClick={() => setActiveTab("moderation")}
              className={`flex items-center gap-1.5 xs:gap-2 px-3 xs:px-4 py-2 xs:py-2.5 rounded-xl text-xs xs:text-sm font-semibold transition-all duration-305 shrink-0 cursor-pointer ${
                activeTab === "moderation"
                  ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] border-t border-white/20"
                  : "text-white/45 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <Shield className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
              <span className="hidden xs:inline">Moderation</span>
              <span className="xs:hidden">Moderation</span>
            </button>
          </div>

          {/* Content panel for active tab */}
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex-1 flex flex-col justify-between relative z-10">
            <div>
              {/* Discord Connection settings */}
              {activeTab === "credentials" && (
                <div className="flex flex-col gap-5 animate-fade-in">
                  <div className="border-b border-slate-900 pb-3">
                    <h2 className="text-lg font-bold font-display text-white">Discord Bot Settings</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Set up your Discord bot to listen for media requests in your chosen channel.
                    </p>
                  </div>

                  {botStatus.status === "error" && (
                    <div className="bg-rose-950/40 text-rose-200 border border-rose-900/60 p-4 rounded-xl flex gap-3 items-start text-xs leading-relaxed animate-pulse">
                      <AlertTriangle className="w-5 h-5 stroke-2 shrink-0 text-rose-500 mt-0.5" />
                      <div>
                        <span className="font-bold block text-sm">Discord Connection Error:</span>
                        <span className="font-mono mt-0.5 block break-all">{botStatus.errorMsg}</span>
                      </div>
                    </div>
                  )}

                  {botStatus.status === "connected" && (
                    <div className="bg-emerald-950/30 text-emerald-300 border border-emerald-900/60 p-4 rounded-xl flex gap-3 items-center text-xs">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div>
                        <span className="font-semibold block text-sm">Bot Connected!</span>
                        The bot is now watching for new media requests in your channel.
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
                      Discord Bot Token (Auth)
                    </label>
                    <input
                      type="password"
                      placeholder="Enter your Discord bot token here"
                      value={config.discordToken}
                      onChange={(e) => setConfig({ ...config, discordToken: e.target.value })}
                      className="bg-black/45 border border-white/10 rounded-xl px-4 py-3 text-sm text-[#e0e0e6] placeholder:text-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300"
                    />
                    <span className="text-[10px] text-white/30">
                      Grab your token from the <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Discord Developer Portal</a>.
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
                      Discord Channel ID (Media Requests)
                    </label>
                    <input
                      type="text"
                      placeholder="Example: 121528642398457810"
                      value={config.channelId}
                      onChange={(e) => setConfig({ ...config, channelId: e.target.value })}
                      className="bg-black/45 border border-white/10 rounded-xl px-4 py-3 text-sm text-[#e0e0e6] placeholder:text-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300"
                    />
                    <span className="text-[10px] text-white/30">
                      Right-click your Discord channel and select "Copy ID" (Developer Mode must be on).
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
                        Media Size Limit
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="8"
                          value={config.mediaMaxSizeMB}
                          onChange={(e) => setConfig({ ...config, mediaMaxSizeMB: Number(e.target.value) })}
                          className="bg-black/45 w-full border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-[#e0e0e6] placeholder:text-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300"
                        />
                        <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs font-mono text-white/30 select-none">MB</span>
                      </div>
                      <span className="text-[10px] text-white/30">
                        Ignore files larger than this to save bandwidth.
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
                        Alert Duration
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="8000"
                          value={config.alertDuration}
                          onChange={(e) => setConfig({ ...config, alertDuration: Number(e.target.value) })}
                          className="bg-black/45 w-full border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-[#e0e0e6] placeholder:text-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300"
                        />
                        <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs font-mono text-white/30 select-none">ms</span>
                      </div>
                      <span className="text-[10px] text-white/30">
                        How long alerts stay on screen (e.g., 8000 for 8 seconds).
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 col-span-2">
                      <label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
                        Emergency Stop Shortcut
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Escape, Space, or S"
                        value={config.stopAlertShortcut || "Escape"}
                        onChange={(e) => setConfig({ ...config, stopAlertShortcut: e.target.value })}
                        className="bg-black/45 w-full border border-white/10 rounded-xl px-4 py-3 text-sm text-[#e0e0e6] placeholder:text-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300"
                      />
                      <span className="text-[10px] text-white/30">
                        Press this key to instantly hide the active media alert.
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 col-span-2">
                      <label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
                        Video Cookies (YouTube, Instagram, TikTok)
                      </label>
                      <textarea
                        placeholder="# Netscape HTTP Cookie File&#10;..."
                        value={config.youtubeCookiesContent || ""}
                        onChange={(e) => setConfig({ ...config, youtubeCookiesContent: e.target.value })}
                        onBlur={(e) => {
                          const raw = e.target.value;
                          if (!raw) return;
                          const relevantDomains = ['youtube.com', 'instagram.com', 'tiktok.com', 'google.com'];
                          const filtered = raw.split('\n').filter(line => {
                            const t = line.trim();
                            if (!t || t.startsWith('#')) return true;
                            return relevantDomains.some(d => t.includes(d));
                          }).join('\n');
                          setConfig({ ...config, youtubeCookiesContent: filtered });
                        }}
                        className="bg-black/45 w-full border border-white/10 rounded-xl px-4 py-3 text-xs font-mono min-h-[140px] text-[#0f0] placeholder:text-white/20 focus:outline-none focus:border-indigo-500 transition-all duration-300"
                      />
                      
                      <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-3 mt-1">
                        <h4 className="text-xs font-bold text-indigo-300 mb-1">How to set up cookies?</h4>
                        <ul className="text-[10px] text-indigo-200/70 space-y-1 list-disc pl-4">
                          <li>Install an extension like <strong>"Get cookies.txt LOCALLY"</strong> for Chrome or Firefox.</li>
                          <li>Log in to your Instagram, TikTok, or YouTube accounts.</li>
                          <li>Use the extension to export your <code>cookies.txt</code> (Netscape format).</li>
                          <li>Open the file with a text editor and paste the content here.</li>
                          <li>This helps the app bypass restrictions and download media as if you were logged in.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Alert Styles and Visuals */}
              {activeTab === "styling" && (
                <div className="flex flex-col gap-5 animate-fade-in">
                  <div className="border-b border-white/10 pb-3">
                    <h2 className="text-lg font-bold font-display text-white">Alert Themes & Visuals</h2>
                    <p className="text-xs text-white/40 mt-1">
                      Customize how alerts look on your stream, including colors and animation styles.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
                      Alert Visual Theme
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: "neon", label: "Neon Glow", desc: "Classic vibrant neon style with dynamic glowing edges." },
                        { id: "glitch", label: "Digital Glitch", desc: "Cyber-themed pixel vibration and CRT scanline effects." },
                        { id: "cyberpunk", label: "Cyberpunk Terminal", desc: "Angular corners, yellow accents, and a raw terminal feel." },
                        { id: "glass", label: "Frosted Glass", desc: "Modern translucent glass effect with soft backlighting." }
                      ].map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setConfig({ ...config, alertStyle: style.id as any })}
                          className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 cursor-pointer ${
                            config.alertStyle === style.id
                              ? "bg-indigo-600/15 border-indigo-500/80 text-white shadow-lg shadow-indigo-600/10"
                              : "bg-black/45 border-white/10 text-white/45 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span className="text-sm font-extrabold block text-white">{style.label}</span>
                          <span className="text-[10px] opacity-75 mt-1 block">{style.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
                          Neon Hex Color
                        </label>
                        <div className="flex gap-2">
                          <div 
                            className="w-11 h-11 rounded-xl shrink-0 border border-white/10 shadow-inner"
                            style={{ backgroundColor: config.neonColor }}
                          />
                          <input
                            type="text"
                            placeholder="#6366f1"
                            value={config.neonColor}
                            onChange={(e) => setConfig({ ...config, neonColor: e.target.value })}
                            className="bg-black/45 w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-[#e0e0e6] placeholder:text-white/25 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col justify-end gap-1 pb-1">
                        <span className="text-xs text-slate-300 font-semibold block">Quick Pick :</span>
                        <div className="flex gap-2.5">
                          {["#6366f1", "#ec4899", "#10b981", "#eab308", "#ef4444", "#a855f7"].map((color) => (
                            <button
                              key={color}
                              onClick={() => setConfig({ ...config, neonColor: color })}
                              className="w-6 h-6 rounded-full cursor-pointer hover:scale-110 active:scale-95 transition"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                </div>
              )}

              {/* Moderation and Security */}
              {activeTab === "moderation" && (
                <div className="flex flex-col gap-6 animate-fade-in">
                  <div className="border-b border-white/10 pb-3">
                    <h2 className="text-lg font-bold font-display text-white">Moderation & Safety</h2>
                    <p className="text-xs text-white/40 mt-1">
                      Control incoming requests, block unwanted words, and keep your stream safe from trolls.
                    </p>
                  </div>

                  {/* Discord AutoMod information */}
                  <div className="bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-xl p-4 flex gap-3 items-start">
                    <Shield className="w-6 h-6 text-[#5865F2] shrink-0" />
                    <div>
                      <h3 className="text-sm font-bold text-[#5865F2] mb-1">Native Protection: Discord AutoMod</h3>
                      <p className="text-xs text-[#5865F2]/70 leading-relaxed">
                        The app works seamlessly with <strong>Discord AutoMod</strong>. Set up your filters for insults, spam, and explicit content directly in your Discord Server Settings. <br/>
                        <span className="text-white/60 mt-1 block">Anything blocked by Discord won't even reach the overlay. It's the best way to stay safe.</span>
                      </p>
                    </div>
                  </div>

                  {/* Custom text filters */}
                  <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 flex flex-col gap-6">
                    <div className="border-b border-white/10 pb-3 mb-1">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        Local Text Filtering
                      </h3>
                      <p className="text-[11px] text-white/40 mt-1">Additional filters applied by the app after Discord AutoMod.</p>
                    </div>

                    {/* Banned words list */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
                        Banned Keywords
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g., spam, troll..."
                          value={bannedWordInput}
                          onChange={(e) => setBannedWordInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddBannedWord()}
                          className="bg-black/45 flex-1 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-[#e0e0e6] placeholder:text-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300"
                        />
                        <button
                          onClick={handleAddBannedWord}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20"
                        >
                          Add
                        </button>
                      </div>
                      {config.bannedWords.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {config.bannedWords.map((word) => (
                            <span
                              key={word}
                              className="bg-rose-950/40 text-rose-300 border border-rose-900/50 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2"
                            >
                              {word}
                              <button
                                onClick={() => handleRemoveBannedWord(word)}
                                className="w-4 h-4 hover:bg-rose-900/60 rounded-full flex items-center justify-center transition"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
                        Action on Banned Words
                      </label>
                      <div className="flex bg-black/45 border border-white/10 rounded-xl p-1 shrink-0">
                        <button
                          onClick={() => setConfig({ ...config, bannedWordsAction: "block" })}
                          className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${
                            config.bannedWordsAction === "block" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80"
                          }`}
                        >
                          Block Alert
                        </button>
                        <button
                          onClick={() => setConfig({ ...config, bannedWordsAction: "censor" })}
                          className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${
                            config.bannedWordsAction === "censor" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80"
                          }`}
                        >
                          Censor (***)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Anti-spam controls */}
                  <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 flex flex-col gap-6">
                    <div className="border-b border-white/10 pb-3 mb-1">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-400" />
                        Spam & Abuse Control
                      </h3>
                      <p className="text-[11px] text-white/40 mt-1">Limit how often and what kind of media users can request.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
                          Block External Links
                        </label>
                        <button
                          onClick={() => setConfig({ ...config, blockLinks: !config.blockLinks })}
                          className={`p-4 rounded-xl border text-left flex gap-3 transition-all duration-300 h-full ${
                            config.blockLinks
                              ? "bg-rose-500/10 border-rose-500/50 text-rose-300"
                              : "bg-black/45 border-white/10 text-white/45 hover:bg-white/5 hover:text-white/80"
                          }`}
                        >
                          <Shield className="w-5 h-5 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block text-sm">External Links</span>
                            <span className="text-[10.5px] opacity-70 mt-1 block leading-relaxed">Blocks any message containing a URL (except for the media URL itself).</span>
                          </div>
                        </button>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
                          Block Spoiler Media
                        </label>
                        <button
                          onClick={() => setConfig({ ...config, blockNSFW: !config.blockNSFW })}
                          className={`p-4 rounded-xl border text-left flex gap-3 transition-all duration-300 h-full ${
                            config.blockNSFW
                              ? "bg-rose-500/10 border-rose-500/50 text-rose-300"
                              : "bg-black/45 border-white/10 text-white/45 hover:bg-white/5 hover:text-white/80"
                          }`}
                        >
                          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block text-sm">Spoiler Filter</span>
                            <span className="text-[10.5px] opacity-70 mt-1 block leading-relaxed">Automatically rejects attachments marked as "spoiler" on Discord.</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                      <label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
                        User Cooldown (Seconds)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          value={config.cooldownSeconds || 0}
                          onChange={(e) => setConfig({ ...config, cooldownSeconds: Number(e.target.value) })}
                          className="bg-black/45 w-full border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm font-bold text-[#e0e0e6] focus:outline-none focus:border-indigo-500 transition-all font-mono"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-xs font-bold">SEC</span>
                      </div>
                      <span className="text-[10.5px] text-white/40 mt-1">
                        How long a user must wait before sending another alert. Set to 0 to disable.
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Save settings button */}
            <div className="flex justify-end pt-6 border-t border-white/10 mt-6 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSaveSettings()}
                  disabled={saveLoading}
                  className="px-6 py-3 cursor-pointer rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/[0.02] disabled:border-white/5 disabled:text-white/20 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all duration-200"
                >
                  {saveLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
          </div>
        </section>

        {/* Right column: Live preview and logs */}
        <section className="lg:col-span-5 flex flex-col gap-6" id="right-logs-panel">
          
          {/* Live overlay preview */}
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl sm:rounded-3xl p-3 sm:p-6 flex flex-col gap-3.5 sm:gap-4 relative z-10">
            <h2 className="text-md font-bold font-display text-white flex items-center gap-2">
              <Tv className="w-4.5 h-4.5 text-indigo-400" />
              OBS Overlay Preview
            </h2>
            
            {/* Embedded overlay render */}
            <OBSOverlayView embedMode={true} onQueueChange={setPendingQueue} />

            {/* Alert queue */}
            {pendingQueue.length > 0 && (
              <div className="mt-2 border-t border-white/10 pt-4">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center justify-between">
                  <span>Alert Queue ({pendingQueue.length})</span>
                </h3>
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {pendingQueue.map((item, idx) => (
                    <div 
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, idx)}
                      className="group flex items-center gap-2 bg-black/40 hover:bg-white/5 border border-white/5 hover:border-indigo-500/30 rounded-xl p-2 cursor-grab active:cursor-grabbing transition"
                    >
                      <GripVertical className="w-4 h-4 text-white/20 group-hover:text-white/40 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">{item.authorName}</div>
                        <div className="text-[10px] text-white/40 truncate">{item.text || "- No text -"}</div>
                      </div>
                      <button 
                        onClick={(e) => cancelAlertFromQueue(item.id, e)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* OBS link */}
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl sm:rounded-3xl p-3 sm:p-6 flex flex-col gap-3.5 sm:gap-4 relative z-10">
            <div>
              <h2 className="text-md font-bold font-display text-white">OBS Browser Source Link</h2>
              <p className="text-[11px] text-white/40 mt-1">
                Copy the link below and add it as a "Browser Source" in your OBS scene.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 bg-black/40 border border-white/10 p-1.5 rounded-xl">
              <span className="flex-1 font-mono text-xs text-indigo-400 px-2 py-2 flex items-center truncate min-w-0">
                {window.location.origin + "/overlay"}
              </span>
              <button
                onClick={copyOverlayUrlToClipboard}
                className={`py-2 px-3.5 rounded-lg text-xs font-bold transition select-none cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
                  copyFeedback
                    ? "bg-emerald-600 text-white"
                    : "bg-indigo-600 text-white hover:bg-indigo-500"
                }`}
              >
                {copyFeedback ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    COPIED
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    COPY
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-white/30 italic">
              * Set your browser source dimensions to Width: 800, Height: 600 (or leave empty if centered).
            </p>
          </div>
        </section>
      </main>

      {/* Alert history log */}
      <section className="px-4 sm:px-6 pb-12 overflow-hidden max-w-7xl w-full mx-auto" id="logs-monitor-board">
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative z-10">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              <div>
                <h2 className="text-lg font-bold font-display text-white">Alert History</h2>
                <p className="text-xs text-white/40">Keep track of media alerts triggered by the Discord bot.</p>
              </div>
            </div>
            {logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="px-3.5 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-xs font-bold transition duration-200 cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear History
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white/80">
              <thead>
                <tr className="border-b border-white/5 text-white/40 font-mono text-[10px] uppercase tracking-widest">
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Original Text</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reason / Diagnosis</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-white/35 font-medium">
                      No alerts have been triggered yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors duration-200">
                      {/* Time */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-white/30 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      {/* Author */}
                      <td className="py-3.5 px-4 font-semibold text-white/90">{log.author}</td>
                      {/* Media type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded text-[10px] font-medium border border-white/10">
                          {log.type === "video" ? (
                            <>
                              <VideoIcon className="w-3 h-3 text-cyan-400" />
                              Video
                            </>
                          ) : log.type === "iframe" ? (
                            <>
                              <Tv className="w-3 h-3 text-amber-500" />
                              Embed
                            </>
                          ) : log.type === "link" ? (
                            <>
                              <Tv className="w-3 h-3 text-indigo-400" />
                              Link (TikTok/IG)
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-3 h-3 text-indigo-400" />
                              Image
                            </>
                          )}
                        </span>
                      </td>
                      {/* Raw text */}
                      <td className="py-3.5 px-4 max-w-xs truncate text-white/50 font-sans" title={log.text}>
                        {log.text || <span className="italic text-white/20">- empty -</span>}
                      </td>
                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full inline-block text-[10px] font-extrabold font-mono tracking-wider ${
                          log.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                            : log.status === "censored"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                            : "bg-red-500/10 text-red-400 border border-red-500/25"
                        }`}>
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                      {/* Reason */}
                      <td className="py-3.5 px-4 text-white/40 italic font-medium">{log.reason}</td>
                      {/* Re-trigger action button */}
                      <td className="py-3.5 px-4 text-right">
                        {(log.status === "approved" || log.status === "censored") ? (
                          <button
                            onClick={() => handleTriggerTest({
                              authorName: log.author,
                              text: log.text,
                              type: log.type,
                              mediaUrl: log.mediaUrl,
                              alertStyle: config.alertStyle,
                              neonColor: config.neonColor,
                              duration: config.alertDuration,
                            })}
                            className="px-2.5 py-1 bg-indigo-600/10 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold rounded-lg transition duration-150 cursor-pointer inline-flex items-center gap-1"
                            title="Re-run this alert on the overlay"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Retry
                          </button>
                        ) : (
                          <span className="text-[10px] text-white/20 font-mono select-none">Locked</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

