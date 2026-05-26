import { useState, useEffect, useRef } from "react";
import { socket } from "../socket";
import ReactPlayer from "react-player";
import { Tv, Bot, Flame, AlertTriangle } from "lucide-react";
import { AlertPayload, Sparkle } from "../types";

const LOG_PREFIX = "OverlayView:";

function isVerticalMedia(alert: AlertPayload | null) {
	if (!alert) return false;

	const normalizedUrl = alert.mediaUrl.toLowerCase();

	return (
		alert.provider === "tiktok" ||
		alert.provider === "instagram" ||
		alert.provider === "youtube-shorts" ||
		normalizedUrl.includes("tiktok") ||
		normalizedUrl.includes("instagram") ||
		normalizedUrl.includes("/shorts/")
	);
}

const ReactPlayerComponent = ReactPlayer as any;

export default function OBSOverlayView({
	embedMode = false,
}: {
	embedMode?: boolean;
}) {
	const [queue, setQueue] = useState<AlertPayload[]>([]);
	const [activeAlert, setActiveAlert] = useState<AlertPayload | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [wsStatus, setWsStatus] = useState<
		"connected" | "connecting" | "disconnected"
	>("connecting");
	const [preloadedUrls, setPreloadedUrls] = useState<Record<string, boolean>>(
		{},
	);
	const preloadingRef = useRef<Set<string>>(new Set());
	const [particles, setParticles] = useState<Sparkle[]>([]);
	const [debugMode, setDebugMode] = useState(false);
	const [iframeStyle, setIframeStyle] = useState({
		scale: 1,
		offsetX: 0,
		offsetY: 0,
	});
	const activeVideoRef = useRef<HTMLVideoElement | null>(null);
	const reactPlayerRef = useRef<any>(null);
	const stateRef = useRef({ queue, activeAlert });
	const isProcessingRef = useRef(false);

	useEffect(() => {
		stateRef.current = { queue, activeAlert };
	}, [queue, activeAlert]);

	const onVideoEndedRef = useRef<(() => void) | null>(null);
	const onVideoErrorRef = useRef<(() => void) | null>(null);
	const onMediaLoadedRef = useRef<(() => void) | null>(null);
	const onVideoLoadedMetadataRef = useRef<
		((durationMs: number) => void) | null
	>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const [currentDuration, setCurrentDuration] = useState(8000);
	const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);
	const cancelCurrentAlertRef = useRef<(() => void) | null>(null);
	const extendCurrentTimeoutRef = useRef<((durationMs: number) => void) | null>(
		null,
	);

	// Handle connection & events
	useEffect(() => {
		const updateStatus = () => {
			if (socket.connected) {
				setWsStatus("connected");
			} else {
				setWsStatus("connecting");
			}
		};

		updateStatus();

		const onConnect = () => {
			setWsStatus("connected");
			debugMode && console.log(LOG_PREFIX, "Socket connected");
			// Restore state
			const cachedState = localStorage.getItem("overlayState");
			if (cachedState) {
				const { queue: cachedQueue, activeAlert: cachedActiveAlert } =
					JSON.parse(cachedState);
				if (cachedQueue) setQueue(cachedQueue);
				if (cachedActiveAlert) setActiveAlert(cachedActiveAlert);
				localStorage.removeItem("overlayState");
			}
		};

		const onDisconnect = () => {
			setWsStatus("disconnected");
			debugMode && console.log(LOG_PREFIX, "Socket disconnected");
			// Cache state
			localStorage.setItem("overlayState", JSON.stringify(stateRef.current));
		};

		const onConnectError = () => {
			setWsStatus("connecting");
		};

		socket.on("connect", onConnect);
		socket.on("disconnect", onDisconnect);
		socket.on("connect_error", onConnectError);

		// Capture incoming discord & simulated alerts
		socket.on("new_alert", (alert: AlertPayload) => {
			debugMode &&
				console.log(LOG_PREFIX, "🔔 New alert received:", {
					id: alert.id,
					type: alert.type,
					provider: alert.provider,
					mediaUrl: alert.mediaUrl,
					authorName: alert.authorName,
					timestamp: alert.timestamp,
				});
			setQueue((prev) => [...prev, alert]);
		});

		socket.on("force_play", () => {
			debugMode && console.log(LOG_PREFIX, "▶️ Force play triggered.");
			if (activeVideoRef.current) {
				activeVideoRef.current.play().catch((e) => debugMode && console.error(LOG_PREFIX, "❌ Error during force play:", e));
			}
			const internalPlayer = reactPlayerRef.current?.getInternalPlayer?.();
			if (internalPlayer && typeof internalPlayer.playVideo === "function") {
				internalPlayer.playVideo();
			}
		});

		socket.on("skip_alert", () => {
			debugMode && console.log(LOG_PREFIX, "🛑 Alert skipped by remote command.");
			if (cancelCurrentAlertRef.current) {
				cancelCurrentAlertRef.current();
			}
		});

		socket.on(
			"update_iframe_style",
			(style: {
				iframeScale: number;
				iframeOffsetX: number;
				iframeOffsetY: number;
			}) => {
				setIframeStyle({
					scale: style.iframeScale,
					offsetX: style.iframeOffsetX,
					offsetY: style.iframeOffsetY,
				});
			},
		);

		return () => {
			socket.off("connect", onConnect);
			socket.off("disconnect", onDisconnect);
			socket.off("connect_error", onConnectError);
			socket.off("new_alert");
			socket.off("skip_alert");
			socket.off("update_iframe_style");
		};
	}, []);

	// Initialize iframe style when alert changes
	useEffect(() => {
		if (activeAlert) {
			setIframeStyle({
				scale: activeAlert.iframeScale || 1,
				offsetX: activeAlert.iframeOffsetX || 0,
				offsetY: activeAlert.iframeOffsetY || 0,
			});
		}
	}, [activeAlert]);

	// Listen to keyboard shortcut to skip/force stop active alerts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!activeAlert) return;

			const configKey =
				typeof activeAlert.stopAlertShortcut === "string" &&
				activeAlert.stopAlertShortcut.trim()
					? activeAlert.stopAlertShortcut.trim()
					: "Escape";
			const key = typeof e.key === "string" ? e.key : "";
			const code = typeof e.code === "string" ? e.code : "";

			const matchesKey =
				key.toLowerCase() === configKey.toLowerCase() ||
				code.toLowerCase() === configKey.toLowerCase() ||
				(configKey.toLowerCase() === "space" && key === " ") ||
				(configKey.toLowerCase() === "escape" && key === "Escape");

			if (matchesKey) {
				debugMode && console.log(LOG_PREFIX, "Alert skipped via shortcut:", configKey);
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

	// Preload media
	useEffect(() => {
		queue.forEach((item) => {
			if (
				preloadedUrls[item.mediaUrl] ||
				preloadingRef.current.has(item.mediaUrl)
			)
				return;

			preloadingRef.current.add(item.mediaUrl);
			debugMode &&
				console.log(LOG_PREFIX, `Preloading: ${item.mediaUrl} (${item.type})`);

			if (
				item.type === "react-player" ||
				item.type === "iframe" ||
				item.type === "link"
			) {
				// Embed links and external web views don't need direct Media preloading
				setPreloadedUrls((prev) => ({ ...prev, [item.mediaUrl]: true }));
			} else if (item.type === "image") {
				const img = new Image();
				img.src = item.mediaUrl;
				img.onload = () => {
					setPreloadedUrls((prev) => ({ ...prev, [item.mediaUrl]: true }));
					debugMode && console.log(LOG_PREFIX, `Image cached: ${item.mediaUrl}`);
				};
				img.onerror = () => {
					setPreloadedUrls((prev) => ({ ...prev, [item.mediaUrl]: true }));
				};
			} else if (item.type === "video") {
				const video = document.createElement("video");
				video.src = item.mediaUrl;
				video.preload = "auto";
				video.muted = true;

				video.oncanplaythrough = () => {
					setPreloadedUrls((prev) => ({ ...prev, [item.mediaUrl]: true }));
					debugMode && console.log(LOG_PREFIX, `Video cached: ${item.mediaUrl}`);
				};
				video.onerror = () => {
					setPreloadedUrls((prev) => ({ ...prev, [item.mediaUrl]: true }));
				};
			} else {
				// Unknown type, mark as "preloaded" to avoid infinite retry
				setPreloadedUrls((prev) => ({ ...prev, [item.mediaUrl]: true }));
			}
		});
	}, [queue, preloadedUrls]);

	// Process queue
	useEffect(() => {
		if (isPlaying || queue.length === 0 || isProcessingRef.current) return;

		const runNextAlert = async () => {
			isProcessingRef.current = true;
			setIsPlaying(true);
			const nextItem = { ...queue[0] };

			// Shift item representation
			setQueue((prev) => prev.slice(1));
			setCurrentDuration(nextItem.duration || 8000);

			// Generate spark particles
			const newSparkles: Sparkle[] = [];
			const particleColors = [
				nextItem.neonColor,
				"#ffffff",
				"#fbcfe8",
				"#c7d2fe",
			];
			for (let i = 0; i < 40; i++) {
				const randomColor =
					particleColors[Math.floor(Math.random() * particleColors.length)];
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
			debugMode &&
				console.log(LOG_PREFIX, "Playing alert:", {
					id: nextItem.id,
					type: nextItem.type,
					provider: nextItem.provider,
					mediaUrl: nextItem.mediaUrl,
					duration: nextItem.duration,
					isVertical: isVerticalMedia(nextItem),
				});

			// Simple artificial lag to let state shift and cache complete
			await new Promise((r) => setTimeout(r, 150));

			// If video, play it
			if (nextItem.type === "video") {
				if (activeVideoRef.current) {
					try {
						activeVideoRef.current.currentTime = 0;
						activeVideoRef.current
							.play()
							.catch((e) => debugMode && console.log(LOG_PREFIX, "Video playback notice:", e));
					} catch (err) {
						console.error(LOG_PREFIX, "Video element failed playback:", err);
					}
				}
				if (backgroundVideoRef.current) {
					try {
						backgroundVideoRef.current.currentTime = 0;
						backgroundVideoRef.current
							.play()
							.catch((e) => debugMode && console.log(LOG_PREFIX, "Background video playback notice:", e));
					} catch (err) {
						console.error(LOG_PREFIX, "Background video element failed playback:", err);
					}
				}
			}

			// Display alert wrapper with cancellable promise
			let resolvePromise: (() => void) | null = null;
			const alertDelayPromise = new Promise<void>((resolve) => {
				resolvePromise = resolve;
			});

			let timeoutId: any = null;
			let loadingTimeoutId: any = null;

			const finishAlert = () => {
				if (loadingTimeoutId) clearTimeout(loadingTimeoutId);
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
			onMediaLoadedRef.current = () => {
				if (loadingTimeoutId) {
					clearTimeout(loadingTimeoutId);
					loadingTimeoutId = null;
				}
			};

			loadingTimeoutId = setTimeout(() => {
				debugMode &&
					console.log(LOG_PREFIX, `Media still loading (timeout): ${nextItem.mediaUrl}`);
				// If it's still loading after 30s and it's not a video (which might be huge),
				// we skip to avoid blocking the stream
				if (nextItem.type !== "video") {
					debugMode && console.log(
						"Media loading timeout, skipping alert",
					);
					finishAlert();
				}
			}, 30000);

			let defaultDuration = nextItem.duration || 8000;

			if (nextItem.type === "video" || nextItem.type === "react-player") {
				onVideoEndedRef.current = finishAlert;
				onVideoErrorRef.current = finishAlert;
				onVideoLoadedMetadataRef.current = (durationMs) => {
					setCurrentDuration(durationMs);
					extendCurrentTimeoutRef.current?.(durationMs);
				};

				// For video alerts (HTML5 and ReactPlayer/YouTube), we ignore the default static parameter
				// database duration entirely, allowing them to play for their real length.
				// There is a 5-minute safeguard backup timeout in case metadata loading gets corrupted.
				timeoutId = setTimeout(finishAlert, 300000);
			} else {
				timeoutId = setTimeout(finishAlert, defaultDuration);
			}

			await alertDelayPromise;
			cancelCurrentAlertRef.current = null;

			// Shutdown active alert triggering exit animations
			setActiveAlert(null);
			setParticles([]);

			// Pause active element safely
			if (activeVideoRef.current) {
				try {
					activeVideoRef.current.pause();
				} catch (e) {}
			}
			if (backgroundVideoRef.current) {
				try {
					backgroundVideoRef.current.pause();
				} catch (e) {}
			}

			// Allow CSS transitions to play before loading next cue item
			await new Promise((r) => setTimeout(r, 1000));
			setIsPlaying(false);
			isProcessingRef.current = false;
		};

		runNextAlert();
	}, [queue, isPlaying]);

	useEffect(() => {
		if (!embedMode && contentRef.current) {
			const resizeObserver = new ResizeObserver(() => {
				const { scrollHeight, scrollWidth } = contentRef.current!;
				document.body.style.height = `${scrollHeight}px`;
				document.body.style.width = `${scrollWidth}px`;
			});

			resizeObserver.observe(contentRef.current);

			return () => {
				resizeObserver.disconnect();
			};
		}
	}, [embedMode, activeAlert]);

	// Handle active styles inline colors
	const activeGlowColor = activeAlert?.neonColor || "#6366f1";

	return (
		<div
			className={`relative flex items-center justify-center overflow-hidden transition-all duration-300 ${
				embedMode
					? "w-full h-full min-h-[280px] sm:min-h-[460px] bg-black/40 border-4 border-dashed border-white/5 rounded-3xl p-1.5 sm:p-6"
					: "absolute inset-0 w-full h-full bg-transparent p-0 m-0"
			}`}
			style={{ background: embedMode ? undefined : "transparent" }}
		>
			{/* Immersive Atmospheric decorations matching design prototype */}
			{embedMode && (
				<>
					<div className="absolute top-6 right-6 w-2 h-2 bg-indigo-400 rounded-full blur-[1px] opacity-65 animate-pulse"></div>
					<div className="absolute bottom-12 left-20 w-1 h-1 bg-purple-400 rounded-full blur-[1px] opacity-45 animate-pulse"></div>
					<div className="absolute top-1/4 left-6 w-1.5 h-1.5 bg-white rounded-full blur-[2px] opacity-35"></div>
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-600/10 blur-[80px] rounded-full pointer-events-none z-0"></div>
				</>
			)}
			{/* Socket Status (only shows when disconnected) */}
			{wsStatus !== "connected" && !embedMode && (
				<div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-slate-950/90 text-amber-500 border border-amber-500/30 px-3 py-1.5 rounded-full text-xs font-mono select-none animate-pulse">
					<AlertTriangle className="w-4.5 h-4.5" />
					<span>Reconnecting...</span>
				</div>
			)}

			{embedMode && (
				<button
					onClick={() => setDebugMode(!debugMode)}
					className="absolute top-4 left-4 z-50 bg-slate-950/80 text-white text-[10px] px-2 py-1 rounded border border-white/10"
				>
					Debug: {debugMode ? "ON" : "OFF"}
				</button>
			)}

			{debugMode && embedMode && activeAlert && (
				<div className="absolute top-16 left-4 z-50 bg-slate-950/90 text-green-400 text-[10px] p-3 rounded border border-green-500/30 font-mono max-w-sm">
					<p>ID: {activeAlert.id}</p>
					<p>URL: {activeAlert.mediaUrl}</p>
					<p>Playing: {isPlaying ? "Yes" : "No"}</p>
				</div>
			)}

			{/* Background particles */}
			{activeAlert && (
				<div className="absolute inset-0 pointer-events-none flex justify-center z-10 overflow-hidden">
					<div className="relative w-full h-full">
						{particles.map((spark) => (
							<span
								key={`spark-${activeAlert.id}-${spark.id}`}
								className="absolute sparkle-particle rounded-full"
								style={
									{
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
									} as any
								}
							/>
						))}
					</div>
				</div>
			)}

			{/* Alert Box */}
			{(() => {
				const isVertical =
					activeAlert &&
					(activeAlert.mediaUrl.toLowerCase().includes("tiktok") ||
						activeAlert.mediaUrl.toLowerCase().includes("instagram") ||
						activeAlert.mediaUrl.toLowerCase().includes("shorts"));
				return (
					<div
						ref={contentRef}
						className={`relative z-20 transition-all duration-700 select-none ${
							embedMode
								? `w-full ${isVertical ? "max-w-lg sm:max-w-xl" : "max-w-2xl"} p-2 sm:p-8 mx-auto`
								: `w-full h-full p-0 flex items-center justify-center`
						} ${
							activeAlert
								? "translate-y-0 scale-100 opacity-100"
								: "translate-y-12 scale-95 opacity-0 pointer-events-none"
						}`}
					>
						{activeAlert && (
							<div
								key={`alert-frame-${activeAlert.id}`}
								className={`relative flex flex-col text-white overflow-hidden transition-all duration-300 ${!embedMode ? "w-full h-full rounded-none border-none justify-center" : "w-full rounded-2xl p-4 sm:p-6 gap-3 sm:gap-4"} ${
									activeAlert.alertStyle === "glass"
										? `bg-white/[0.03] backdrop-blur-2xl shadow-2xl ${!embedMode ? "" : "border border-white/10"}`
										: activeAlert.alertStyle === "glitch"
											? `bg-stone-950 shadow-[4px_4px_0_#ef4444] animate-glitch crt-overlay ${!embedMode ? "" : "border-2 border-cyan-500"}`
											: activeAlert.alertStyle === "cyberpunk"
												? `bg-zinc-950 shadow-[4px_4px_24px_rgba(234,179,8,0.15)] ${!embedMode ? "" : "border-l-4 border-yellow-400 border-t-2 border-r border-b border-zinc-900"} [clip-path:polygon(0_0,95%_0,100%_15px,100%_100%,5%_100%,0_85%)]`
												: `bg-slate-950/95 relative animate-neon-pulse ${!embedMode ? "" : "border-2"}` // default neon style
								}`}
								style={
									{
										borderColor:
											activeAlert.alertStyle === "neon"
												? activeAlert.neonColor
												: undefined,
										"--glow-color": activeAlert.neonColor,
									} as any
								}
							>
								{/* Style Accent for Cyberpunk Style */}
								{activeAlert.alertStyle === "cyberpunk" && (
									<div className="absolute top-0 right-12 bg-yellow-400 text-zinc-950 font-mono text-[9px] px-2 py-0.5 tracking-wider font-extrabold uppercase">
										ALERT // COM_GATEWAY_IN
									</div>
								)}

								<div
									className={`relative z-10 flex flex-col ${!embedMode ? "p-4 sm:p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none" : ""}`}
								>
									{/* User Info */}
									<div
										className={`flex items-center gap-3 ${!embedMode ? "mb-3" : ""}`}
									>
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
												Nouveau média d'abonnés
											</span>
											<span
												className={`text-lg sm:text-2xl font-black drop-shadow-md tracking-tight truncate ${
													activeAlert.alertStyle === "cyberpunk"
														? "font-mono font-bold text-yellow-400"
														: "font-sans font-extrabold"
												}`}
											>
												{activeAlert.authorName}
											</span>
										</div>
									</div>

									{/* Message text */}
									{(() => {
										const cleanedText = activeAlert.text
											? activeAlert.text
													.replace(/https?:\/\/[^\s]+/gi, "")
													.trim()
											: "";
										if (!cleanedText) return null;
										return (
											<p
												className={`text-xs sm:text-lg text-slate-100 leading-relaxed break-words ${
													activeAlert.alertStyle === "cyberpunk"
														? "font-mono text-[11px] sm:text-sm bg-zinc-900/80 p-2 sm:p-3 rounded border border-zinc-800"
														: "font-sans font-medium"
												} ${!embedMode ? "drop-shadow-lg" : ""}`}
											>
												{cleanedText}
											</p>
										);
									})()}
								</div>

								{/* Media Content */}
								{(() => {
									const isVertical = isVerticalMedia(activeAlert);
									const aspectClass = embedMode
										? isVertical
											? "aspect-[9/16] w-[auto] max-w-full h-auto max-h-[60vh] sm:max-h-[650px] mx-auto mt-2"
											: activeAlert.type !== "image" &&
												  activeAlert.type !== "link"
												? "aspect-video w-full max-h-[75vh] mt-2"
												: "w-full min-h-[140px] sm:min-h-[220px] max-h-[350px] sm:max-h-[500px] mt-2"
										: "w-full h-full"; // OBS mode strictly absolute full size

									return (
										<div
											className={`${!embedMode ? "relative w-full h-full flex items-center justify-center overflow-hidden bg-black/80" : "relative rounded-xl mt-2 overflow-hidden bg-black flex items-center justify-center shrink-0 min-w-[280px] sm:min-w-[400px]"} ${aspectClass}`}
										>
											{activeAlert.type === "video" ? (
												<>
													<video
														key={`bg-${activeAlert.id}`}
														ref={backgroundVideoRef}
														src={activeAlert.mediaUrl}
														className="absolute inset-0 w-full h-full object-cover scale-110 blur-[40px] opacity-60 pointer-events-none"
														muted
														loop
														playsInline
														onCanPlay={(e) => {
															e.currentTarget.play().catch(() => {});
														}}
													/>
													<video
														key={`main-${activeAlert.id}`}
														ref={activeVideoRef}
														src={activeAlert.mediaUrl}
														className={`w-full h-full block relative z-10 object-contain ${embedMode ? "bg-black" : "bg-transparent drop-shadow-[0_0_2rem_rgba(0,0,0,0.8)]"}`}
														playsInline
														controls={false}
														muted={false}
														autoPlay
														onEnded={() => onVideoEndedRef.current?.()}
														onError={(e) => {
															debugMode && console.error("Video Error:", e);
															onVideoErrorRef.current?.();
														}}
														onLoadedMetadata={(e) => {
															onMediaLoadedRef.current?.();
															const videoDurationMs =
																e.currentTarget.duration * 1000;
															if (videoDurationMs && !isNaN(videoDurationMs)) {
																onVideoLoadedMetadataRef.current?.(
																	videoDurationMs,
																);
															}
														}}
														onCanPlay={(e) => {
															e.currentTarget
																.play()
																.catch((err) =>
																	console.log("Auto play catch:", err),
																);
														}}
													/>
												</>
											) : activeAlert.type === "react-player" ? (
												<div
													key={`player-container-${activeAlert.id}`}
													className={`w-full h-full border-0 block relative z-10 overflow-hidden ${embedMode ? "bg-black" : ""}`}
												>
													<ReactPlayerComponent
														key={`player-${activeAlert.id}`}
														ref={reactPlayerRef}
														url={activeAlert.mediaUrl}
														playing={true}
														muted={true}
														controls={false}
														playsinline={true}
														width="100%"
														height="100%"
														onReady={(player: any) => {
															onMediaLoadedRef.current?.();
															const duration = player.getDuration();
															if (duration && duration > 0) {
																onVideoLoadedMetadataRef.current?.(
																	duration * 1000,
																);
															}
														}}
														onStart={() => {
															onMediaLoadedRef.current?.();
														}}
														onEnded={() => {
															onVideoEndedRef.current?.();
														}}
														onError={(e: any) => {
															debugMode && console.error(
																"ReactPlayer Error:",
																e,
															);
															onVideoErrorRef.current?.();
														}}
														config={{
															youtube: {
																playerVars: {
																	autoplay: 1,
																	mute: 1,
																	controls: 0,
																	rel: 0,
																	modestbranding: 1,
																	playsinline: 1,
																	origin: window.location.origin,
																	enablejsapi: 1,
																},
															} as any,
														}}
													/>
												</div>
											) : activeAlert.type === "iframe" ? (
												<iframe
													src={
														activeAlert.mediaUrl.includes("twitch.tv") &&
														!activeAlert.mediaUrl.includes("parent=")
															? `${activeAlert.mediaUrl}${activeAlert.mediaUrl.includes("?") ? "&" : "?"}parent=${window.location.hostname}&autoplay=true`
															: activeAlert.mediaUrl
													}
													title="Média Embed"
													className={`w-full h-full border-0 block relative z-10 ${
														activeAlert.provider === "instagram"
															? "scale-[1.15] origin-top"
															: ""
													}`}
													style={{
														transform: `scale(${iframeStyle.scale}) translate(${iframeStyle.offsetX}px, ${iframeStyle.offsetY}px)`,
													}}
													allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
													allowFullScreen
													onLoad={() => onMediaLoadedRef.current?.()}
												/>
											) : activeAlert.type === "link" ? (
												<div className="w-full h-full p-4 flex flex-col items-center justify-center relative z-10 bg-slate-950/45 mx-2 text-center select-text">
													<div className="flex items-center gap-2 mb-2">
														{activeAlert.mediaUrl.includes("tiktok.com") ? (
															<span className="text-sm font-black bg-zinc-800 px-3 py-1 rounded border border-zinc-700 font-sans tracking-tight text-white shadow-md">
																TikTok (Lien)
															</span>
														) : activeAlert.mediaUrl.includes(
																"instagram.com",
														  ) ? (
															<span className="text-sm font-bold bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 px-3 py-1 rounded text-white shadow-md font-sans">
																Instagram (Lien)
															</span>
														) : activeAlert.mediaUrl.includes("twitter.com") ||
														  activeAlert.mediaUrl.includes("x.com") ? (
															<span className="text-sm font-extrabold bg-neutral-900 px-3 py-1 rounded text-white shadow-md font-mono border border-neutral-800">
																Twitter / X
															</span>
														) : (
															<span className="text-sm font-semibold bg-indigo-950/40 text-indigo-400 px-3 py-1 rounded border border-indigo-900/40 font-sans">
																Lien Extérieur
															</span>
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
													<span className="text-[10px] text-zinc-400/60 block uppercase font-mono tracking-widest">
														Cliquez pour ouvrir le lien
													</span>
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
											{/* Background glow accent for neon styles */}
											{activeAlert.alertStyle === "neon" && (
												<div
													className="absolute inset-0 opacity-15 filter blur-2xl animate-pulse pointer-events-none z-0"
													style={{ backgroundColor: activeAlert.neonColor }}
												/>
											)}
										</div>
									);
								})()}

								{/* Progress Bar */}
								<div className="absolute bottom-0 left-0 w-full h-2 bg-slate-950/40 pointer-events-none overflow-hidden z-20">
									<div
										key={activeAlert.id + "-" + currentDuration}
										className="h-full rounded-r-full animate-progress-timer"
										style={
											{
												backgroundColor: activeAlert.neonColor,
												boxShadow: `0 0 10px ${activeAlert.neonColor}`,
												"--timer-duration": `${currentDuration}ms`,
											} as any
										}
									/>
								</div>
							</div>
						)}
					</div>
				);
			})()}

			{/* Queue status */}
			{embedMode && queue.length > 0 && (
				<div className="absolute bottom-3 left-4 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded">
					En attente: {queue.length} alerte(s)
				</div>
			)}
			{embedMode && !activeAlert && queue.length === 0 && (
				<div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-slate-500">
					<Tv className="w-10 h-10 mb-2 opacity-30 stroke-1" />
					<span className="text-sm font-medium">
						Aperçu en temps réel: Overlay inactif
					</span>
					<span className="text-xs text-slate-600 mt-1">
						Déclenchez une simulation de test ci-dessous
					</span>
				</div>
			)}
		</div>
	);
}
