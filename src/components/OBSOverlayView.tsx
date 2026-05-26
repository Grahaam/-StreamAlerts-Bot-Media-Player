import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Tv, Bot, Flame, AlertTriangle } from "lucide-react";
import { AlertPayload, Sparkle } from "../types";

export default function OBSOverlayView({ embedMode = false, onQueueChange }: { embedMode?: boolean, onQueueChange?: (queue: AlertPayload[]) => void }) {
  const [queue, setQueue] = useState<AlertPayload[]>([]);
  const [activeAlert, setActiveAlert] = useState<AlertPayload | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wsStatus, setWsStatus] = useState<"connected" | "connecting" | "disconnected">("connecting");
  const [preloadedUrls, setPreloadedUrls] = useState<Record<string, boolean>>({});
  const [particles, setParticles] = useState<Sparkle[]>([]);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const onVideoEndedRef = useRef<(() => void) | null>(null);
  const onVideoErrorRef = useRef<(() => void) | null>(null);
  const onVideoLoadedMetadataRef = useRef<((durationMs: number) => void) | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const alertStartTimeRef = useRef<number>(0);
  const [currentDuration, setCurrentDuration] = useState(8000);
  const cancelCurrentAlertRef = useRef<(() => void) | null>(null);
  const extendCurrentTimeoutRef = useRef<((durationMs: number) => void) | null>(null);

  // socket.io setup
  useEffect(() => {
    const socket = io(window.location.origin, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setWsStatus("connected");
      console.log("Connected to server");
    });

    socket.on("disconnect", () => {
      setWsStatus("disconnected");
      console.log("Disconnected from server");
    });

    socket.on("connect_error", () => {
      setWsStatus("connecting");
    });

    socket.on("new_alert", (alert: AlertPayload) => {
      setQueue((prev) => [...prev, alert]);
    });

    socket.on("force_queue_update", (newQueue: AlertPayload[]) => {
      setQueue(newQueue);
    });

    socket.on("remove_queue_item", (itemId: string) => {
      setQueue((prev) => prev.filter(item => item.id !== itemId));
    });

    socket.on("skip_alert", () => {
      console.log("Remote skip triggered");
      if (cancelCurrentAlertRef.current) {
        cancelCurrentAlertRef.current();
      }
    });

    return () => {
      socket.close();
    };
  }, []);

  // skip shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeAlert) return;

      const configKey = activeAlert.stopAlertShortcut || "Escape";

      const matchesKey = 
        e.key.toLowerCase() === configKey.toLowerCase() ||
        e.code.toLowerCase() === configKey.toLowerCase() ||
        (configKey.toLowerCase() === "space" && e.key === " ") ||
        (configKey.toLowerCase() === "escape" && e.key === "Escape");

      if (matchesKey) {
        console.log(`Skipped alert (${configKey})`);
        e.preventDefault();
        e.stopPropagation();
        if (cancelCurrentAlertRef.current) {
          cancelCurrentAlertRef.current();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [activeAlert]);

  // media preloading
  useEffect(() => {
    queue.forEach((item) => {
      if (preloadedUrls[item.mediaUrl]) return;

      console.log(`Preloading ${item.mediaUrl}`);
      if (item.type === "iframe" || item.type === "link") {
        setPreloadedUrls((prev) => ({ ...prev, [item.mediaUrl]: true }));
      } else if (item.type === "image") {
        const img = new Image();
        img.referrerPolicy = "no-referrer";
        img.src = item.mediaUrl;
        img.onload = () => {
          setPreloadedUrls((prev) => ({ ...prev, [item.mediaUrl]: true }));
          console.log(`Cached image: ${item.mediaUrl}`);
        };
        img.onerror = () => {
          setPreloadedUrls((prev) => ({ ...prev, [item.mediaUrl]: true }));
        };
      } else {
        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.src = item.mediaUrl;
        video.preload = "auto";
        video.muted = true;
        
        video.onloadedmetadata = (e) => {
          console.log(`Metadata loaded for ${item.id}`);
        };

        video.oncanplaythrough = (e) => {
          console.log(`Ready to play: ${item.id}`);
          setPreloadedUrls((prev) => ({ ...prev, [item.mediaUrl]: true }));
          console.log(`Cached video: ${item.mediaUrl}`);
        };
        video.onerror = (e: any) => {
          const target = e.target as HTMLVideoElement;
          console.error(`Preload error for ${item.mediaUrl.substring(0, 50)}...`, target.error);
          setPreloadedUrls((prev) => ({ ...prev, [item.mediaUrl]: true }));
        };
      }
    });
  }, [queue, preloadedUrls]);

  // process alerts
  useEffect(() => {
    if (isPlaying || queue.length === 0) return;

    const runNextAlert = async () => {
      setIsPlaying(true);
      const nextItem = { ...queue[0] };
      
      setQueue((prev) => prev.slice(1));
      setCurrentDuration(nextItem.duration || 8000);

      // sparkles
      const newSparkles: Sparkle[] = [];
      const particleColors = [nextItem.neonColor, "#ffffff", "#fbcfe8", "#c7d2fe"];
      for (let i = 0; i < 40; i++) {
        const randomColor = particleColors[Math.floor(Math.random() * particleColors.length)];
        newSparkles.push({
          id: i,
          dx: `${(Math.random() * 300 - 150).toFixed(0)}px`,
          dy: `${(Math.random() * -240 - 60).toFixed(0)}px`,
          size: `${(Math.random() * 10 + 4).toFixed(0)}px`,
          delay: `${(Math.random() * 1.2).toFixed(2)}s`,
          dur: `${(Math.random() * 2 + 1.2).toFixed(2)}s`,
          bg: randomColor,
        });
      }
      setParticles(newSparkles);
      setActiveAlert(nextItem);

      await new Promise((r) => setTimeout(r, 150));

      let resolvePromise: (() => void) | null = null;
      const alertDelayPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      let timeoutId: any = null;

      const finishAlert = () => {
        if (timeoutId) clearTimeout(timeoutId);
        onVideoEndedRef.current = null;
        onVideoErrorRef.current = null;
        onVideoLoadedMetadataRef.current = null;
        if (resolvePromise) {
          resolvePromise();
          resolvePromise = null;
        }
      };

      const extendTimeout = (newDurationMs: number) => {
        if (timeoutId) clearTimeout(timeoutId);
        setCurrentDuration(newDurationMs);
        timeoutId = setTimeout(finishAlert, Math.max(newDurationMs, 2000));
      };

      cancelCurrentAlertRef.current = finishAlert;
      extendCurrentTimeoutRef.current = extendTimeout;
      
      let defaultDuration = nextItem.duration || 8000;

      if (nextItem.type === "video") {
        onVideoEndedRef.current = finishAlert;
        onVideoErrorRef.current = finishAlert;
        onVideoLoadedMetadataRef.current = (durationMs) => {
          setCurrentDuration(durationMs);
          extendCurrentTimeoutRef.current?.(durationMs);
        };

        // backup timeout for video issues (5 mins)
        timeoutId = setTimeout(finishAlert, 300000);
      } else {
        timeoutId = setTimeout(finishAlert, defaultDuration);
      }

      await alertDelayPromise;
      cancelCurrentAlertRef.current = null;

      setActiveAlert(null);
      setParticles([]);

      if (activeVideoRef.current) {
        activeVideoRef.current.pause();
      }

      // wait for exit animations
      await new Promise((r) => setTimeout(r, 1000));
      setIsPlaying(false);
    };

    runNextAlert();
  }, [queue, isPlaying]);

  useEffect(() => {
    if (onQueueChange) onQueueChange(queue);
  }, [queue, onQueueChange]);

  // Determine active glow color
  const activeGlowColor = activeAlert?.neonColor || "#6366f1";

  // Sync progress bar animation
  useEffect(() => {
    let animationFrameId: number;
    
    const updateProgress = () => {
      if (!activeAlert || !progressBarRef.current) return;
      
      let progress = 0;
      if (activeAlert.type === "video" && activeVideoRef.current) {
        const video = activeVideoRef.current;
        if (video.duration) {
           progress = 1 - (video.currentTime / video.duration);
        } else {
           progress = 1;
        }
      } else {
         const elapsed = Date.now() - alertStartTimeRef.current;
         progress = 1 - (elapsed / currentDuration);
      }
      
      progress = Math.max(0, Math.min(1, progress));
      progressBarRef.current.style.width = `${progress * 100}%`;
      
      if (progress > 0) {
        animationFrameId = requestAnimationFrame(updateProgress);
      }
    };
    
    if (activeAlert) {
      alertStartTimeRef.current = Date.now();
      animationFrameId = requestAnimationFrame(updateProgress);
    }
    
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [activeAlert, currentDuration]);

  return (
    <div 
      className={`relative flex items-center justify-center overflow-hidden transition-all duration-300 ${
        embedMode 
          ? "w-full h-full min-h-[280px] sm:min-h-[460px] bg-black/40 border-4 border-dashed border-white/5 rounded-3xl p-1.5 sm:p-6" 
          : "w-screen h-screen bg-transparent p-0 m-0"
      } ${!embedMode && activeAlert ? "pointer-events-auto" : !embedMode ? "pointer-events-none" : ""}`}
      style={{ background: embedMode ? undefined : "transparent" }}
    >
      {/* Background decorations */}
      {embedMode && (
        <>
          <div className="absolute top-6 right-6 w-2 h-2 bg-indigo-400 rounded-full blur-[1px] opacity-65 animate-pulse"></div>
          <div className="absolute bottom-12 left-20 w-1 h-1 bg-purple-400 rounded-full blur-[1px] opacity-45 animate-pulse"></div>
          <div className="absolute top-1/4 left-6 w-1.5 h-1.5 bg-white rounded-full blur-[2px] opacity-35"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-600/10 blur-[80px] rounded-full pointer-events-none z-0"></div>
        </>
      )}
      {/* Socket.IO status indicator (visible only during reconnecting) */}
      {wsStatus !== "connected" && !embedMode && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-slate-950/90 text-amber-500 border border-amber-500/30 px-3 py-1.5 rounded-full text-xs font-mono select-none animate-pulse">
          <AlertTriangle className="w-4.5 h-4.5" />
          <span>OBS Link: Reconnecting WS...</span>
        </div>
      )}

      {/* Particle effects (active when an alert is playing) */}
      {activeAlert && (
        <div className="absolute inset-x-0 bottom-1/2 translate-y-24 pointer-events-none flex justify-center z-10">
          <div className="relative w-[500px] h-[50px]">
            {particles.map((spark) => (
              <span
                key={spark.id}
                className="absolute sparkle-particle rounded-full pointer-events-none"
                style={{
                  left: "50%",
                  bottom: "10%",
                  width: spark.size,
                  height: spark.size,
                  backgroundColor: spark.bg,
                  boxShadow: `0 0 8px ${spark.bg}`,
                  "--dx": spark.dx,
                  "--dy": spark.dy,
                  "--p-delay": spark.delay,
                  "--p-dur": spark.dur,
                } as any}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main alert display area */}
      {(() => {
        const isVerticalMedia = (url: string) => {
          return url.includes("tiktok.com") || 
                 url.includes("tiktokcdn.com") || 
                 url.includes("tiktokcdn-us.com") || 
                 url.includes("instagram.com") || 
                 url.includes("shorts");
        };
        const isVertical = activeAlert && isVerticalMedia(activeAlert.mediaUrl);
        return (
      <div 
        className={`relative z-20 transition-all duration-700 select-none mx-auto ${
          embedMode 
            ? `w-full ${isVertical ? "max-w-sm sm:max-w-md" : "max-w-xl sm:max-w-2xl"} p-1 sm:p-8` 
            : `w-[100vw] h-[100vh] p-0 flex flex-col overflow-hidden`
        } ${
          activeAlert 
            ? "translate-y-0 scale-100 opacity-100 rotate-0 pointer-events-auto" 
            : "translate-y-16 scale-90 opacity-0 rotate-1 select-none pointer-events-none"
        }`}
      >
        {activeAlert && (
          <div
            className={`relative flex flex-col text-white overflow-hidden transition-all duration-300 w-full ${!embedMode ? "h-full rounded-none border-none" : "rounded-2xl p-4 sm:p-6 gap-3 sm:gap-4"} ${
              activeAlert.alertStyle === "glass"
                ? `bg-white/[0.03] backdrop-blur-2xl shadow-2xl ${!embedMode ? "" : "border border-white/10"}`
                : activeAlert.alertStyle === "glitch"
                ? `bg-stone-950 shadow-[4px_4px_0_#ef4444] animate-glitch crt-overlay ${!embedMode ? "" : "border-2 border-cyan-500"}`
                : activeAlert.alertStyle === "cyberpunk"
                ? `bg-zinc-950 shadow-[4px_4px_24px_rgba(234,179,8,0.15)] ${!embedMode ? "" : "border-l-4 border-yellow-400 border-t-2 border-r border-b border-zinc-900"} [clip-path:polygon(0_0,95%_0,100%_15px,100%_100%,5%_100%,0_85%)]`
                : `bg-slate-950/95 relative animate-neon-pulse ${!embedMode ? "" : "border-2"}` // default neon style
            }`}
            style={{
              borderColor: activeAlert.alertStyle === "neon" ? activeAlert.neonColor : undefined,
              "--glow-color": activeAlert.neonColor,
            } as any}
          >
            {/* Cyberpunk style accent */}
            {activeAlert.alertStyle === "cyberpunk" && (
              <div className="absolute top-0 right-12 bg-yellow-400 text-zinc-950 font-mono text-[9px] px-2 py-0.5 tracking-wider font-extrabold uppercase">
                ALERT // COM_GATEWAY_IN
              </div>
            )}

            {/* Overlay content for OBS */}
            <div className={`relative z-10 flex flex-col ${!embedMode ? "p-4 sm:p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none" : ""}`}>
              {/* User info in alert header */}
              <div className={`flex items-center gap-3 ${!embedMode ? "mb-3" : ""}`}>
                <div className="relative">
                  <img
                    src={activeAlert.authorAvatar}
                    alt="Avatar"
                    className="w-11 h-11 sm:w-14 sm:h-14 rounded-full border-2 object-cover shadow-lg"
                    style={{ borderColor: activeAlert.neonColor }}
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-indigo-600 rounded-full p-1 text-white border border-slate-950">
                    <Bot className="w-3 h-3" />
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="text-indigo-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest font-display flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-indigo-400/20 text-indigo-400 shrink-0" />
                      New Subscriber Media
                    </span>
                  <span className={`text-lg sm:text-2xl font-black drop-shadow-md tracking-tight truncate ${
                    activeAlert.alertStyle === "cyberpunk" ? "font-mono font-bold text-yellow-400" : "font-sans font-extrabold"
                  }`}>
                    {activeAlert.authorName}
                  </span>
                </div>
              </div>

              {/* message text */}
              {(() => {
                const cleanedText = activeAlert.text ? activeAlert.text.replace(/https?:\/\/[^\s]+/gi, '').trim() : "";
                if (!cleanedText) return null;
                return (
                  <p className={`text-xs sm:text-lg text-slate-100 leading-relaxed break-words ${
                    activeAlert.alertStyle === "cyberpunk" ? "font-mono text-[11px] sm:text-sm bg-zinc-900/80 p-2 sm:p-3 rounded border border-zinc-800" : "font-sans font-medium"
                  } ${!embedMode ? "drop-shadow-lg" : ""}`}>
                    {cleanedText}
                  </p>
                );
              })()}
            </div>

            {/* media area */}
            {(() => {
              const isVertical = isVerticalMedia(activeAlert.mediaUrl);

              const aspectClass = embedMode 
                ? (isVertical 
                  ? "aspect-[9/16] w-[auto] max-w-full h-auto max-h-[60vh] sm:max-h-[650px] mx-auto mt-2" 
                  : (activeAlert.type !== "image" && activeAlert.type !== "link" 
                      ? "aspect-video w-full max-h-[75vh] mt-2" 
                      : "w-full min-h-[140px] sm:min-h-[220px] max-h-[350px] sm:max-h-[500px] mt-2"))
                : ""; 

              return (
              <div className={`${!embedMode ? "absolute inset-0 z-0 w-[100vw] h-[100vh] flex items-center justify-center overflow-hidden" : "relative rounded-xl mt-2 overflow-hidden bg-black flex items-center justify-center shrink-0 min-w-[280px] sm:min-w-[400px]"} ${aspectClass}`}>
                {activeAlert.type === "video" ? (
                <>
                  {!embedMode && isVertical ? (
                    <div 
                      className="absolute z-0" 
                      style={{ 
                        width: '120%', 
                        height: '120%', 
                        backgroundImage: `url(${activeAlert.mediaUrl})`, 
                        filter: 'blur(20px)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      <video
                        src={activeAlert.mediaUrl}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    </div>
                  ) : (
                    <video
                      src={activeAlert.mediaUrl}
                      className="absolute inset-0 w-full h-full object-cover scale-110 blur-[40px] opacity-60 pointer-events-none"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  )}
                  <video
                    ref={activeVideoRef}
                    src={activeAlert.mediaUrl}
                    className={!embedMode && isVertical ? "relative h-[90vh] max-w-full object-contain z-10 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] pointer-events-auto" : `w-full h-full block relative z-10 object-contain pointer-events-auto ${embedMode ? "bg-black" : "bg-transparent drop-shadow-[0_0_2rem_rgba(0,0,0,0.8)]"}`}
                    playsInline
                    controls={true}
                    muted={embedMode}
                    autoPlay
                    onEnded={() => onVideoEndedRef.current?.()}
                    onError={(e) => {
                      const err = e.currentTarget.error;
                      const rawUrl = activeAlert?.mediaUrl || 'unknown';
                      console.error(`Video error for ${rawUrl.substring(0, 50)}...`, err?.message);
                      
                      if (err?.code === 4 && activeAlert && !activeAlert.mediaUrl.includes("retry=1")) {
                        console.log("Retrying video stream...");
                        setTimeout(() => {
                           setActiveAlert(prev => prev ? { ...prev, mediaUrl: prev.mediaUrl + (prev.mediaUrl.includes('?') ? '&' : '?') + 'retry=1' } : prev);
                        }, 500);
                      } else if (err?.code === 4 && activeAlert && activeAlert.mediaUrl.includes("/api/proxy-media") && !activeAlert.mediaUrl.includes("fallback=1")) {
                        console.log("Proxy failed, trying direct link");
                        const rawUrlMatch = activeAlert.mediaUrl.match(/[?&]url=([^&]+)/);
                        if (rawUrlMatch && rawUrlMatch[1]) {
                           const fallbackUrl = decodeURIComponent(rawUrlMatch[1]);
                           setTimeout(() => {
                              setActiveAlert(prev => prev ? { ...prev, mediaUrl: fallbackUrl + (fallbackUrl.includes('?') ? '&' : '?') + 'fallback=1' } : prev);
                           }, 500);
                        } else {
                           onVideoErrorRef.current?.();
                        }
                      } else {
                        onVideoErrorRef.current?.();
                      }
                    }}
                    onPlay={(e) => {
                      if (activeAlert?.type === "video" && onVideoLoadedMetadataRef.current) {
                         const videoDurationMs = e.currentTarget.duration * 1000;
                         if (videoDurationMs && isFinite(videoDurationMs)) {
                           onVideoLoadedMetadataRef.current(videoDurationMs);
                         }
                      }
                    }}
                    onPause={() => {
                      if (cancelCurrentAlertRef.current && extendCurrentTimeoutRef.current) {
                        extendCurrentTimeoutRef.current(3600000); 
                      }
                    }}
                    onLoadedMetadata={(e) => {
                      const videoDurationMs = e.currentTarget.duration * 1000;
                      console.log(`Video metadata: ${videoDurationMs}ms`);
                      if (videoDurationMs && !isNaN(videoDurationMs) && isFinite(videoDurationMs)) {
                        onVideoLoadedMetadataRef.current?.(videoDurationMs);
                      }
                    }}
                    onCanPlay={(e) => {
                      const videoDurationMs = e.currentTarget.duration * 1000;
                      if (videoDurationMs && !isNaN(videoDurationMs) && isFinite(videoDurationMs)) {
                        onVideoLoadedMetadataRef.current?.(videoDurationMs);
                      }
                      e.currentTarget.play().catch(err => console.error("Auto-play failed", err));
                    }}
                  />
                </>
              ) : activeAlert.type === "iframe" ? (
                <div 
                  className="w-full h-full relative z-10 flex flex-col pt-0"
                  onMouseEnter={() => {
                    if (extendCurrentTimeoutRef.current) extendCurrentTimeoutRef.current(3600000);
                  }}
                >
                  <iframe
                    src={activeAlert.mediaUrl.includes("twitch.tv") 
                          ? `${activeAlert.mediaUrl}&parent=${window.location.hostname}&autoplay=true` 
                          : activeAlert.mediaUrl}
                    title="Embed"
                    className="w-full h-full border-0 block absolute inset-0 z-0 bg-transparent pointer-events-auto"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  {activeAlert.provider === "instagram" && (
                     <div className="absolute top-4 left-4 right-4 bg-red-600/90 text-white text-sm p-3 rounded-xl shadow-lg z-20 backdrop-blur-md border border-red-500 animate-in fade-in slide-in-from-top-4 pointer-events-none">
                        <p className="font-bold mb-1">[Warning] Autoplay Blocked by Instagram</p>
                        <p className="opacity-90 leading-tight">Instagram blocks automated video downloads without a login. To enable native MP4 autoplay for Instagram reels, please upload a <code>cookies.txt</code> file to the root directory.</p>
                     </div>
                  )}
                  {activeAlert.provider === "tiktok" && (
                     <div className="absolute top-4 left-4 right-4 bg-orange-600/90 text-white text-sm p-3 rounded-xl shadow-lg z-20 backdrop-blur-md border border-orange-500 animate-in fade-in slide-in-from-top-4 pointer-events-none">
                        <p className="font-bold mb-1">[Warning] TikTok Page Embed</p>
                        <p className="opacity-90 leading-tight">Direct video extraction failed. Showing standard browser embedded player which may require clicking to play.</p>
                     </div>
                  )}
                </div>
              ) : activeAlert.type === "link" ? (
                <div className="w-full h-full p-4 flex flex-col items-center justify-center relative z-10 bg-slate-950/45 mx-2 text-center select-text">
                  <div className="flex items-center gap-2 mb-2">
                    {activeAlert.mediaUrl.includes("tiktok.com") ? (
                      <span className="text-sm font-black bg-zinc-800 px-3 py-1 rounded border border-zinc-700 font-sans tracking-tight text-white shadow-md">TikTok (Link)</span>
                    ) : activeAlert.mediaUrl.includes("instagram.com") ? (
                      <span className="text-sm font-bold bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 px-3 py-1 rounded text-white shadow-md font-sans">Instagram (Link)</span>
                    ) : activeAlert.mediaUrl.includes("twitter.com") || activeAlert.mediaUrl.includes("x.com") ? (
                      <span className="text-sm font-extrabold bg-neutral-900 px-3 py-1 rounded text-white shadow-md font-mono border border-neutral-800">Twitter / X</span>
                    ) : (
                      <span className="text-sm font-semibold bg-indigo-950/40 text-indigo-400 px-3 py-1 rounded border border-indigo-900/40 font-sans">External Link</span>
                    )}
                  </div>
                  <a 
                    href={activeAlert.mediaUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs sm:text-sm text-indigo-300 hover:text-indigo-200 underline break-all font-mono line-clamp-2 max-w-sm mt-1 mb-2 px-1"
                  >
                    {activeAlert.mediaUrl}
                  </a>
                  <span className="text-[10px] text-zinc-400/60 block uppercase font-mono tracking-widest">Click to open link</span>
                </div>
              ) : (
                <>
                  <img
                    src={activeAlert.mediaUrl}
                    className="absolute inset-0 w-full h-full object-cover scale-110 blur-[40px] opacity-60 pointer-events-none"
                    alt=""
                  />
                  <img
                    src={activeAlert.mediaUrl}
                    alt="Discord Media"
                    className={`w-full h-full block relative z-10 object-contain ${embedMode ? "bg-black" : "bg-transparent drop-shadow-[0_0_2rem_rgba(0,0,0,0.8)]"}`}
                    referrerPolicy="no-referrer"
                  />
                </>
              )}
              {/* Neon glow background effect */}
              {activeAlert.alertStyle === "neon" && (
                <div 
                  className="absolute inset-0 opacity-15 filter blur-2xl animate-pulse pointer-events-none z-0"
                  style={{ backgroundColor: activeAlert.neonColor }}
                />
              )}
            </div>
            );
            })()}

            {/* Alert progress bar */}
            <div className="absolute bottom-0 left-0 w-full h-2 bg-slate-950/40 pointer-events-none overflow-hidden z-20">
              <div
                ref={progressBarRef}
                className="h-full rounded-r-full"
                style={{
                  width: "100%",
                  backgroundColor: activeAlert.neonColor,
                  boxShadow: `0 0 10px ${activeAlert.neonColor}`
                }}
              />
            </div>
          </div>
        )}
      </div>
      );
      })()}

      {/* dashboard preview debug label */}
      {embedMode && queue.length > 0 && (
        <div className="absolute bottom-3 left-4 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded">
          Queue: {queue.length} alert(s)
        </div>
      )}
      {embedMode && !activeAlert && queue.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-slate-500">
          <Tv className="w-10 h-10 mb-2 opacity-30 stroke-1" />
          <span className="text-sm font-medium">Real-time Preview: Overlay Idle</span>
          <span className="text-xs text-slate-600 mt-1">Trigger a test simulation below</span>
        </div>
      )}
    </div>
  );
}

// Dashboard section start (this file is for overlay only) - Content below this line is not part of the overlay and belongs to StreamerDashboard.tsx

