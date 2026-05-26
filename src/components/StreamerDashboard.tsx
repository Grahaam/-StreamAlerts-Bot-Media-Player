import { useState, useEffect, useRef } from "react";
import { socket, getLatency } from "../socket";
import {
	Bot,
	Settings,
	Activity,
	Sliders,
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
	Clock,
} from "lucide-react";
import { UIConfig, LogEntry } from "../types";
import OBSOverlayView from "./OBSOverlayView";

export default function StreamerDashboard() {
	const [activeTab, setActiveTab] = useState<
		"credentials" | "styling" | "filters" | "simulator"
	>("credentials");
	const [saveLoading, setSaveLoading] = useState(false);
	const [latency, setLatency] = useState(0);
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
		iframeScale: 1,
		iframeOffsetX: 0,
		iframeOffsetY: 0,
	});

	const [botStatus, setBotStatus] = useState({
		status: "disconnected",
		botUser: "",
		errorMsg: "",
	});

	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [bannedWordInput, setBannedWordInput] = useState("");
	const [copyFeedback, setCopyFeedback] = useState(false);

	// Form states for custom simulator triggers
	const [simName, setSimName] = useState("Viewer_Lucky_Hype");
	const [simText, setSimText] = useState(
		"Un clip de fou furieux sur le boss final ce soir ! GG 🏆✨",
	);
	const [simType, setSimType] = useState<"image" | "video">("image");
	const [simMediaUrl, setSimMediaUrl] = useState(
		"https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1280&auto=format&fit=crop",
	);

	// Fetch settings and logs
	const fetchSettingsAndLogs = async () => {
		try {
			const setRes = await fetch("/api/settings");
			const configData = await setRes.json();
			setConfig(configData);

			const logRes = await fetch("/api/logs");
			const logData = await logRes.json();
			setLogs(logData);

			const botRes = await fetch("/api/bot-status");
			const botData = await botRes.json();
			setBotStatus(botData);
		} catch (err) {
			console.error("Failed to fetch settings/logs:", err);
		}
	};

	// Get bot status
	const fetchBotStatus = async () => {
		try {
			const botRes = await fetch("/api/bot-status");
			const botData = await botRes.json();
			setBotStatus(botData);
		} catch (err) {
			console.error("Failed to fetch bot status:", err);
		}
	};

	useEffect(() => {
		fetchSettingsAndLogs();

		// Listen for new logs via socket
		socket.on("new_log", (log: LogEntry) => {
			setLogs((prev) => [log, ...prev].slice(0, 100));
		});

		// Update bot status every 4s
		const interval = setInterval(() => {
			fetchBotStatus();
		}, 4000);

		// Update latency every 1s
		const latencyInterval = setInterval(() => {
			setLatency(getLatency());
		}, 1000);

		return () => {
			clearInterval(interval);
			clearInterval(latencyInterval);
			socket.off("new_log");
		};
	}, []);

	// Handle keyboard shortcut
	useEffect(() => {
		const handleKeyDown = async (e: KeyboardEvent) => {
			// Don't trigger if typing in an input
			if (
				document.activeElement?.tagName === "INPUT" ||
				document.activeElement?.tagName === "TEXTAREA"
			) {
				return;
			}

			const configKey =
				typeof config.stopAlertShortcut === "string" &&
				config.stopAlertShortcut.trim()
					? config.stopAlertShortcut.trim()
					: "Escape";
			const key = typeof e.key === "string" ? e.key : "";
			const code = typeof e.code === "string" ? e.code : "";

			const matchesKey =
				key.toLowerCase() === configKey.toLowerCase() ||
				code.toLowerCase() === configKey.toLowerCase() ||
				(configKey.toLowerCase() === "space" && key === " ") ||
				(configKey.toLowerCase() === "escape" && key === "Escape");

			if (matchesKey) {
				// console.log(`Shortcut triggered: ${key}`);
				e.preventDefault();
				try {
					await fetch("/api/skip-alert", { method: "POST" });
				} catch (err) {
					console.error("Failed to skip alert", err);
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
			console.error(err);
		}
	};

	// Add tag-like banned word rules
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
			console.error(err);
		}
	};

	// Trigger test simulation
	const handleTriggerTest = async (preset?: any) => {
		setSaveLoading(true);
		const payload = preset || {
			authorName: simName,
			text: simText,
			type: simType,
			mediaUrl: simMediaUrl,
			alertStyle: config.alertStyle,
			neonColor: config.neonColor,
			duration: config.alertDuration,
		};

    // console.log("Triggering test:", payload);

		try {
			const response = await fetch("/api/trigger-test", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const data = await response.json();
			// console.log("Test triggered:", data);
		} catch (err) {
			console.error("Failed to trigger test:", err);
		} finally {
			setSaveLoading(false);
		}
	};

	const handleForcePlay = async () => {
		try {
			await fetch("/api/force-play", { method: "POST" });
		} catch (err) {
			console.error("Failed to force play", err);
		}
	};

	const copyOverlayUrlToClipboard = () => {
		const url = window.location.origin + "/overlay";
		navigator.clipboard.writeText(url).then(() => {
			setCopyFeedback(true);
			setTimeout(() => setCopyFeedback(false), 2500);
		});
	};

	// Premade simulation presets
	const presets = [
		{
			label: "GIF Chat Rigolo",
			authorName: "Gamer_Mimi_😺",
			text: "Quand le stream commence enfin et que l'ambiance est au rendez-vous ! 🥂🎉",
			type: "image",
			mediaUrl:
				"https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3hveXQ1djRycXUzZW03Nm1sdXQyYjBhMjBrd281ZnA1ODlhZm5kZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/L13yIu3sO2W50LDZKs/giphy.gif",
		},
		{
			label: "Vidéo Boucle Synthwave",
			authorName: "Neon_Pilot_88",
			text: "L'esthétique de ton stream de ce soir est tout simplement incroyable. Ambiance rétro au max ! 📼💜",
			type: "video",
			mediaUrl:
				"https://assets.mixkit.co/videos/preview/mixkit-retro-futuristic-grid-background-with-laser-lights-42582-large.mp4",
		},
		{
			label: "Victoire de Team (Image Unsplash)",
			authorName: "Captain_Raid",
			text: "Top 1 mémorable ! On a roulé sur la game !! Incroyable travail d'équipe 🥇🥊",
			type: "image",
			mediaUrl:
				"https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1280&auto=format&fit=crop",
		},
		{
			label: "Vibe Relax Calme",
			authorName: "ZenStreamer",
			text: "Une stream chill... parfait pour un vendredi soir tranquille 🛋️☕",
			type: "image",
			mediaUrl:
				"https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1280&auto=format&fit=crop",
		},
	];

	return (
		<div className="min-h-screen bg-[#050508] text-[#e0e0e6] flex flex-col font-sans selection:bg-indigo-600 selection:text-white relative overflow-hidden">
			{/* Dynamic Background Glowing Accents */}
			<div className="absolute top-[15%] left-[75%] -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
			<div className="absolute top-[65%] left-[15%] -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-purple-600/5 blur-[130px] rounded-full pointer-events-none z-0"></div>

			{/* 1. Header Navigation Bar */}
			<nav className="min-h-16 border-b border-white/10 px-4 sm:px-8 py-3 sm:py-0 flex flex-col sm:flex-row items-center sm:justify-between gap-3 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0 z-30">
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)] transition hover:scale-110 duration-200">
						<div className="w-4 h-4 border-2 border-white rounded-sm"></div>
					</div>
					<div>
						<span className="font-bold text-lg sm:text-xl tracking-tight text-white flex items-center gap-2">
							StreamAlerts{" "}
							<span className="text-indigo-400 font-medium">Hub</span>
							<span className="hidden xs:inline bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] uppercase font-mono px-2 py-0.5 rounded-full font-bold tracking-widest leading-none">
								v1.1.0
							</span>
						</span>
					</div>
				</div>

				{/* System core Connection indicators status */}
				<div className="flex items-center gap-2 sm:gap-4 relative z-10 w-full sm:w-auto justify-between sm:justify-end">
					{/* Discord Bot Status Card */}
					<div
						className={`flex items-center gap-2 px-3 py-1 border rounded-full transition-all duration-300 text-xs font-semibold uppercase tracking-wider ${
							botStatus.status === "connected"
								? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
								: botStatus.status === "connecting"
									? "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse"
									: "bg-red-500/10 border-red-500/20 text-red-0"
						}`}
					>
						<div
							className={`w-2 h-2 rounded-full ${
								botStatus.status === "connected"
									? "bg-emerald-400 animate-pulse"
									: botStatus.status === "connecting"
										? "bg-amber-400"
										: "bg-red-400"
							}`}
						/>
						<span className="text-[10px] tracking-wide shrink-0">
							Bot{" "}
							{botStatus.status === "connected"
								? "Connecté"
								: botStatus.status === "connecting"
									? "Liaison..."
									: "Déconnecté"}
						</span>

						{botStatus.status !== "connected" &&
							botStatus.status !== "connecting" && (
								<button
									onClick={handleManualBotReconnect}
									className="ml-1 p-0.5 hover:bg-white/10 rounded text-red-400 transition"
									title="Reconnecter le bot Discord"
								>
									<RefreshCw className="w-3 h-3" />
								</button>
							)}
					</div>

					{/* WebSocket Live Status indicator */}
					<div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-xs font-semibold uppercase tracking-wider">
						<div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
						<span className="text-[10px] tracking-wide shrink-0 hidden sm:inline">
							WebSocket Live
						</span>
						<span className="text-[10px] tracking-wide shrink-0 sm:hidden">
							WS Live
						</span>
						<span className="text-[10px] font-mono border-l border-indigo-500/30 pl-2 flex items-center gap-1">
							<Clock className="w-3 h-3" />
							{latency}ms
						</span>
					</div>

					<div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center shrink-0 hidden sm:flex">
						<span className="text-sm font-bold text-white">JD</span>
					</div>
				</div>
			</nav>

			{/* Main Grid View */}
			<main className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
				{/* LEFT COLUMN: Setup Settings, Styles, Filtering (7 cols) */}
				<section
					className="lg:col-span-7 flex flex-col gap-6"
					id="left-setup-panel"
				>
					{/* Bento-style selector header */}
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
							<span className="hidden xs:inline">Discord Connexion</span>
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
							<span className="hidden xs:inline">Alertes & Styles</span>
							<span className="xs:hidden">Styles</span>
						</button>
						<button
							onClick={() => setActiveTab("filters")}
							className={`flex items-center gap-1.5 xs:gap-2 px-3 xs:px-4 py-2 xs:py-2.5 rounded-xl text-xs xs:text-sm font-semibold transition-all duration-305 shrink-0 cursor-pointer ${
								activeTab === "filters"
									? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] border-t border-white/20"
									: "text-white/45 hover:text-white/80 hover:bg-white/5"
							}`}
						>
							<ShieldAlert className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
							<span className="hidden xs:inline">Modération & Filtres</span>
							<span className="xs:hidden">Modération</span>
						</button>
						<button
							onClick={() => setActiveTab("simulator")}
							className={`flex items-center gap-1.5 xs:gap-2 px-3 xs:px-4 py-2 xs:py-2.5 rounded-xl text-xs xs:text-sm font-semibold transition-all duration-305 shrink-0 cursor-pointer ${
								activeTab === "simulator"
									? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] border-t border-white/20"
									: "text-white/45 hover:text-white/80 hover:bg-white/5"
							}`}
						>
							<Play className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
							<span className="hidden xs:inline">Test Simulé</span>
							<span className="xs:hidden">Simulateur</span>
						</button>
					</div>

					{/* Dynamic Forms Container Panel */}
					<div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex-1 flex flex-col justify-between relative z-10">
						<div>
							{/* TAB 1: Discord Credentials Form */}
							{activeTab === "credentials" && (
								<div className="flex flex-col gap-5 animate-fade-in">
									<div className="border-b border-slate-900 pb-3">
										<h2 className="text-lg font-bold font-display text-white">
											Liaison Bot Discord
										</h2>
										<p className="text-xs text-slate-400 mt-1">
											Configurez l'accès du bot Discord pour qu'il écoute le
											salon spécificités de votre serveur de streaming.
										</p>
									</div>

									{botStatus.status === "error" && (
										<div className="bg-rose-950/40 text-rose-200 border border-rose-900/60 p-4 rounded-xl flex gap-3 items-start text-xs leading-relaxed animate-pulse">
											<AlertTriangle className="w-5 h-5 stroke-2 shrink-0 text-rose-500 mt-0.5" />
											<div>
												<span className="font-bold block text-sm">
													Erreur de liaison Discord:
												</span>
												<span className="font-mono mt-0.5 block break-all">
													{botStatus.errorMsg}
												</span>
											</div>
										</div>
									)}

									{botStatus.status === "connected" && (
										<div className="bg-emerald-950/30 text-emerald-300 border border-emerald-900/60 p-4 rounded-xl flex gap-3 items-center text-xs">
											<CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
											<div>
												<span className="font-semibold block text-sm">
													Réseau Bot Connecté!
												</span>
												Le bot écoute de manière permanente les nouveaux clips
												dans le salon paramétré.
											</div>
										</div>
									)}

									<div className="flex flex-col gap-1.5">
										<label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
											Token Privé Bot Discord (Authentification)
										</label>
										<input
											type="password"
											placeholder="Saisissez le token de votre application bot Discord"
											value={config.discordToken}
											onChange={(e) =>
												setConfig({ ...config, discordToken: e.target.value })
											}
											className="bg-black/45 border border-white/10 rounded-xl px-4 py-3 text-sm text-[#e0e0e6] placeholder:text-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300"
										/>
										<span className="text-[10px] text-white/30">
											Vous pouvez créer et récupérer ce jeton sur le site{" "}
											<a
												href="https://discord.com/developers/applications"
												target="_blank"
												rel="noreferrer"
												className="text-indigo-400 hover:underline"
											>
												Portail Discord Developer
											</a>
											.
										</span>
									</div>

									<div className="flex flex-col gap-1.5">
										<label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
											ID Salon Discord Écoute (Salon de Clips)
										</label>
										<input
											type="text"
											placeholder="Exemple: 121528642398457810"
											value={config.channelId}
											onChange={(e) =>
												setConfig({ ...config, channelId: e.target.value })
											}
											className="bg-black/45 border border-white/10 rounded-xl px-4 py-3 text-sm text-[#e0e0e6] placeholder:text-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300"
										/>
										<span className="text-[10px] text-white/30">
											Faites un clic droit sur votre salon textuel Discord pour
											"Copier l'identifiant" (Mode Développeur requis sur
											Discord).
										</span>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div className="flex flex-col gap-1.5">
											<label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
												Limite de taille média
											</label>
											<div className="relative">
												<input
													type="number"
													placeholder="8"
													value={config.mediaMaxSizeMB}
													onChange={(e) =>
														setConfig({
															...config,
															mediaMaxSizeMB: Number(e.target.value),
														})
													}
													className="bg-black/45 w-full border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-[#e0e0e6] placeholder:text-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300"
												/>
												<span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs font-mono text-white/30 select-none">
													Mo
												</span>
											</div>
											<span className="text-[10px] text-white/30">
												Pour soulager la bande passante, ignore les fichiers
												plus lourds.
											</span>
										</div>

										<div className="flex flex-col gap-1.5">
											<label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
												Temps d'affichage Alerte
											</label>
											<div className="relative">
												<input
													type="number"
													placeholder="8000"
													value={config.alertDuration}
													onChange={(e) =>
														setConfig({
															...config,
															alertDuration: Number(e.target.value),
														})
													}
													className="bg-black/45 w-full border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-[#e0e0e6] placeholder:text-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300"
												/>
												<span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs font-mono text-white/30 select-none">
													ms
												</span>
											</div>
											<span className="text-[10px] text-white/30">
												Durée à l'écran (ex: 8000 pour 8 secondes)
											</span>
										</div>

										<div className="flex flex-col gap-1.5 col-span-2">
											<label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
												Raccourci Clavier d'Arrêt d'Urgence
											</label>
											<input
												type="text"
												placeholder="Par exemple: Escape ou Space ou S"
												value={config.stopAlertShortcut || "Escape"}
												onChange={(e) =>
													setConfig({
														...config,
														stopAlertShortcut: e.target.value,
													})
												}
												className="bg-black/45 w-full border border-white/10 rounded-xl px-4 py-3 text-sm text-[#e0e0e6] placeholder:text-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300"
											/>
											<span className="text-[10px] text-white/30">
												Appuyez sur cette touche (ex: Escape, Space, s) pour
												masquer l'alerte média active instantanément.
											</span>
										</div>
									</div>
								</div>
							)}

							{/* TAB 2: Custom Layout visual styling settings */}
							{activeTab === "styling" && (
								<div className="flex flex-col gap-5 animate-fade-in">
									<div className="border-b border-white/10 pb-3">
										<h2 className="text-lg font-bold font-display text-white">
											Aesthetic Styles & Visuals
										</h2>
										<p className="text-xs text-white/40 mt-1">
											Choisissez la charte graphique de l'affichage incrusté de
											votre stream ainsi que les teintes de vos néons animés.
										</p>
									</div>

									<div className="flex flex-col gap-1.5">
										<label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
											Thème Visuel d'Alertes
										</label>
										<div className="grid grid-cols-2 gap-3">
											{[
												{
													id: "neon",
													label: "Néon Glow (Classique)",
													desc: "Éléments enveloppés d’un tube néon vibrant et dynamique.",
												},
												{
													id: "glitch",
													label: "Digital Glitch (Cyber)",
													desc: "Effets de pixels qui vibrent et déformations de trame de jeu.",
												},
												{
													id: "cyberpunk",
													label: "Technic Cyberpunk",
													desc: "Coupe de coins typée terminal, liseré jaune et éléments bruts.",
												},
												{
													id: "glass",
													label: "Glassmorphic Frosted",
													desc: "Verre ultra poli translucide rétroéclairé par la teinte.",
												},
											].map((style) => (
												<button
													key={style.id}
													onClick={() =>
														setConfig({
															...config,
															alertStyle: style.id as any,
														})
													}
													className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 cursor-pointer ${
														config.alertStyle === style.id
															? "bg-indigo-600/15 border-indigo-500/80 text-white shadow-lg shadow-indigo-600/10"
															: "bg-black/45 border-white/10 text-white/45 hover:bg-white/5 hover:text-white"
													}`}
												>
													<span className="text-sm font-extrabold block text-white">
														{style.label}
													</span>
													<span className="text-[10px] opacity-75 mt-1 block">
														{style.desc}
													</span>
												</button>
											))}
										</div>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="flex flex-col gap-1.5">
											<label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
												Teinte Hexadécimale du Néon
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
													onChange={(e) =>
														setConfig({ ...config, neonColor: e.target.value })
													}
													className="bg-black/45 w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-[#e0e0e6] placeholder:text-white/25 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300"
												/>
											</div>
										</div>

										<div className="flex flex-col justify-end gap-1 pb-1">
											<span className="text-xs text-slate-300 font-semibold block">
												Nuancier Rapide :
											</span>
											<div className="flex gap-2.5">
												{[
													"#6366f1",
													"#ec4899",
													"#10b981",
													"#eab308",
													"#ef4444",
													"#a855f7",
												].map((color) => (
													<button
														key={color}
														onClick={() =>
															setConfig({ ...config, neonColor: color })
														}
														className="w-6 h-6 rounded-full cursor-pointer hover:scale-110 active:scale-95 transition"
														style={{ backgroundColor: color }}
													/>
												))}
											</div>
										</div>
									</div>

									<div className="border-t border-white/10 pt-5 mt-5">
										<h3 className="text-sm font-bold text-white mb-4">
											Iframe Adjustment Controls
										</h3>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
											{[
												{
													label: "Scale",
													key: "iframeScale",
													min: 0.5,
													max: 2,
													step: 0.1,
												},
												{
													label: "Offset X",
													key: "iframeOffsetX",
													min: -200,
													max: 200,
													step: 1,
												},
												{
													label: "Offset Y",
													key: "iframeOffsetY",
													min: -200,
													max: 200,
													step: 1,
												},
											].map((control) => (
												<div
													key={control.key}
													className="flex flex-col gap-1.5"
												>
													<label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
														{control.label} (
														{config[control.key as keyof UIConfig]})
													</label>
													<input
														type="range"
														min={control.min}
														max={control.max}
														step={control.step}
														value={
															config[control.key as keyof UIConfig] as number
														}
														onChange={async (e) => {
															const val = parseFloat(e.target.value);
															const newConfig = {
																...config,
																[control.key]: val,
															};
															setConfig(newConfig);
															await fetch("/api/iframe-style", {
																method: "POST",
																headers: { "Content-Type": "application/json" },
																body: JSON.stringify({
																	iframeScale: newConfig.iframeScale,
																	iframeOffsetX: newConfig.iframeOffsetX,
																	iframeOffsetY: newConfig.iframeOffsetY,
																}),
															});
														}}
														className="w-full h-2 bg-black/45 rounded-lg appearance-none cursor-pointer accent-indigo-500"
													/>
												</div>
											))}
										</div>
									</div>
								</div>
							)}

							{/* TAB 3: Advanced content filtering settings */}
							{activeTab === "filters" && (
								<div className="flex flex-col gap-5 animate-fade-in">
									<div className="border-b border-white/10 pb-3">
										<h2 className="text-lg font-bold font-display text-white">
											Filtrage de contenu anti-trolls
										</h2>
										<p className="text-xs text-white/40 mt-1">
											Sécurisez vos lives en prévenant l'apparition de termes à
											caractère insultant ou inadaptés pour votre audience.
										</p>
									</div>

									{/* Local rule-based safety banner */}
									<div className="bg-gradient-to-r from-emerald-600/10 to-teal-600/5 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
										<div className="flex gap-3">
											<div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 shrink-0">
												<CheckCircle2 className="w-5 h-5" />
											</div>
											<div>
												<span className="text-sm font-extrabold text-white flex items-center gap-2">
													Filtrage Local Ultra-Sécurisé
													<span className="bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[9px] uppercase font-mono px-1.5 py-0.2 rounded font-black">
														ACTIF
													</span>
												</span>
												<p className="text-[11px] text-white/40 mt-0.5 leading-relaxed">
													Le système de détection des mots-clés s'exécute
													localement de façon instantanée, garantissant la
													sécurité de votre live de manière ultra-sécurisée.
												</p>
											</div>
										</div>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="flex flex-col gap-1.5">
											<label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
												Comportement à l'interception de mots
											</label>
											<select
												value={config.bannedWordsAction}
												onChange={(e) => {
													const newConfig = {
														...config,
														bannedWordsAction: e.target.value as any,
													};
													setConfig(newConfig);
													handleSaveSettings(newConfig);
												}}
												className="bg-black/45 border border-white/10 rounded-xl px-4 py-3 text-sm text-[#e0e0e6] focus:outline-none focus:border-indigo-500 transition"
											>
												<option value="censor" className="bg-[#0a0a0f]">
													Censurer les mots (ex: s**m)
												</option>
												<option value="block" className="bg-[#0a0a0f]">
													Ignorer / Bloquer l'alerte au complet
												</option>
											</select>
										</div>

										<div className="flex flex-col gap-1.5">
											<label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
												Ajouter un terme interdit à votre liste
											</label>
											<div className="flex gap-2">
												<input
													type="text"
													placeholder="Exemple: scam"
													value={bannedWordInput}
													onChange={(e) => setBannedWordInput(e.target.value)}
													onKeyDown={(e) => {
														if (e.key === "Enter") handleAddBannedWord();
													}}
													className="bg-black/45 w-full border border-white/10 rounded-xl px-4 py-2 text-sm text-[#e0e0e6] placeholder:text-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
												/>
												<button
													onClick={handleAddBannedWord}
													className="px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
												>
													AJOUTER
												</button>
											</div>
										</div>
									</div>

									{/* Words List Tag display */}
									<div className="flex flex-col gap-2">
										<span className="text-xs font-bold text-white/50 font-mono uppercase tracking-wider">
											Votre liste de mots interdits ({config.bannedWords.length}
											) :
										</span>
										<div className="bg-black/35 border border-white/10 rounded-2xl p-4 min-h-[90px] max-h-[140px] overflow-y-auto flex flex-wrap gap-2">
											{config.bannedWords.length === 0 ? (
												<span className="text-xs text-white/25 font-medium">
													Aucun mot banni déclaré.
												</span>
											) : (
												config.bannedWords.map((word) => (
													<span
														key={word}
														className="bg-white/5 group border border-white/5 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 text-white/85 font-medium font-sans"
													>
														{word}
														<button
															onClick={() => handleRemoveBannedWord(word)}
															className="text-white/40 hover:text-red-400 cursor-pointer transition size-3.5 flex items-center justify-center rounded"
														>
															<X className="w-3 h-3 stroke-2" />
														</button>
													</span>
												))
											)}
										</div>
									</div>
								</div>
							)}

							{/* TAB 4: Manual simulator configuration panel */}
							{activeTab === "simulator" && (
								<div className="flex flex-col gap-5 animate-fade-in">
									<div className="border-b border-white/10 pb-3">
										<h2 className="text-lg font-bold font-display text-white">
											Manual Quick Simulator Panel
										</h2>
										<p className="text-xs text-white/40 mt-1">
											Remplissez manuellement le formulaire pour insérer à
											volonté votre propre média à tester directement à l'écran.
										</p>
									</div>

									<button
										onClick={() => handleForcePlay()}
										className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm rounded-xl cursor-pointer shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 transition active:scale-95"
									>
										<Play className="w-4 h-4 fill-current" />
										FORCE PLAY (DEBUG)
									</button>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="flex flex-col gap-1.5">
											<label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
												Nom d'Auteur Alerte
											</label>
											<input
												type="text"
												value={simName}
												onChange={(e) => setSimName(e.target.value)}
												className="bg-black/45 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-sans text-slate-200 placeholder:text-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300"
											/>
										</div>

										<div className="flex flex-col gap-1.5">
											<label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
												Nature du Document Média
											</label>
											<div className="grid grid-cols-2 gap-2">
												<button
													onClick={() => setSimType("image")}
													className={`py-2 px-3 border rounded-xl text-xs font-bold cursor-pointer transition-all duration-200 flex items-center justify-center gap-1.5 ${
														simType === "image"
															? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
															: "bg-black/45 border-white/10 text-white/45 hover:text-white hover:bg-white/5"
													}`}
												>
													<ImageIcon className="w-4 h-4" />
													Image / GIF
												</button>
												<button
													onClick={() => setSimType("video")}
													className={`py-2 px-3 border rounded-xl text-xs font-bold cursor-pointer transition-all duration-200 flex items-center justify-center gap-1.5 ${
														simType === "video"
															? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
															: "bg-black/45 border-white/10 text-white/45 hover:text-white hover:bg-white/5"
													}`}
												>
													<VideoIcon className="w-4 h-4" />
													Vidéo (mp4/webm)
												</button>
											</div>
										</div>
									</div>

									<div className="flex flex-col gap-1.5">
										<label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
											Contenu du Texte d'accompagnement Discord
										</label>
										<textarea
											value={simText}
											onChange={(e) => setSimText(e.target.value)}
											rows={2}
											className="bg-black/45 font-sans border border-white/10 rounded-xl p-3 text-sm text-slate-200 placeholder:text-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300 resize-none"
										/>
									</div>

									<div className="flex flex-col gap-1.5">
										<label className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">
											Lien HTTP Direct du média hébergé
										</label>
										<input
											type="text"
											value={simMediaUrl}
											onChange={(e) => setSimMediaUrl(e.target.value)}
											placeholder="Https://images.unsplash.com/..."
											className="bg-black/45 font-mono border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder:text-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300"
										/>
									</div>

									<button
										onClick={() => handleTriggerTest()}
										className="w-full py-3 mt-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm rounded-xl cursor-pointer shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition active:scale-95"
									>
										<Play className="w-4 h-4 fill-current" />
										DECLENCHER LA SIMULATION MANUELLE
									</button>
								</div>
							)}
						</div>

						{/* Bottom Actions Row to standard forms */}
						{activeTab !== "simulator" && (
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
											Enregistrement...
										</>
									) : (
										<>
											<CheckCircle2 className="w-4 h-4" />
											Enregistrer les réglages
										</>
									)}
								</button>
							</div>
						)}
					</div>
				</section>

				{/* RIGHT COLUMN: Live Previews or Logs table (5 cols) */}
				<section
					className="lg:col-span-5 flex flex-col gap-6"
					id="right-logs-panel"
				>
					{/* Integrated Live Observer / Preview elements */}
					<div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl sm:rounded-3xl p-3 sm:p-6 flex flex-col gap-3.5 sm:gap-4 relative z-10">
						<h2 className="text-md font-bold font-display text-white flex items-center gap-2">
							<Tv className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
							Interactive live monitor preview
						</h2>

						{/* Embedded Live overlay layer render */}
						<OBSOverlayView embedMode={true} />

						{/* Presets testing buttons grid */}
						<div className="flex flex-col gap-2 shrink-0">
							<span className="text-[10px] uppercase font-mono tracking-widest text-white/30 font-bold block">
								Testez en un clic :
							</span>
							<div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
								{presets.map((p, idx) => (
									<button
										key={idx}
										onClick={() => handleTriggerTest(p)}
										className="p-2.5 rounded-xl border border-white/10 bg-black/40 text-left hover:bg-white/5 text-xs text-white/70 font-sans hover:text-white transition duration-300 cursor-pointer flex items-center gap-2 truncate"
									>
										<Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
										<span className="truncate">{p.label}</span>
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Copyable OBS Links */}
					<div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl sm:rounded-3xl p-3 sm:p-6 flex flex-col gap-3.5 sm:gap-4 relative z-10">
						<div>
							<h2 className="text-md font-bold font-display text-white">
								Intégration OBS Streamer Links
							</h2>
							<p className="text-[11px] text-white/40 mt-1">
								Copiez le lien ci-dessous et ajoutez-le en tant que "Source
								Navigateur" (Browser Source) dans votre logiciel OBS.
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
										COPIÉ
									</>
								) : (
									<>
										<Copy className="w-3.5 h-3.5" />
										COPIER
									</>
								)}
							</button>
						</div>
						<p className="text-[10px] text-white/30 italic">
							* Configurez les dimensions de la source dans OBS à : Largeur 800,
							Hauteur 600 (ou laissez vide en Centré).
						</p>
					</div>
				</section>
			</main>

			{/* FULL WIDTH LOGS BOARD DISPLAY PANEL */}
			<section
				className="px-4 sm:px-6 pb-12 overflow-hidden max-w-7xl w-full mx-auto"
				id="logs-monitor-board"
			>
				<div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative z-10">
					<div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
						<div className="flex items-center gap-2">
							<FileText className="w-5 h-5 text-indigo-400" />
							<div>
								<h2 className="text-lg font-bold font-display text-white">
									Console historique de modération
								</h2>
								<p className="text-xs text-white/40">
									Suivi et statuts des alertes médias déclenchées par le bot
									Discord
								</p>
							</div>
						</div>
						{logs.length > 0 && (
							<div className="flex gap-2">
								<button
									onClick={() => (window.location.href = "/api/logs/export")}
									className="px-3.5 py-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-xs font-bold transition duration-200 cursor-pointer flex items-center gap-1"
								>
									<Copy className="w-3.5 h-3.5" />
									Exporter JSON
								</button>
								<button
									onClick={handleClearLogs}
									className="px-3.5 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-xs font-bold transition duration-200 cursor-pointer flex items-center gap-1"
								>
									<Trash2 className="w-3.5 h-3.5" />
									Vider l'historique
								</button>
							</div>
						)}
					</div>

					<div className="overflow-x-auto">
						<table className="w-full text-left text-xs text-white/80">
							<thead>
								<tr className="border-b border-white/5 text-white/40 font-mono text-[10px] uppercase tracking-widest">
									<th className="py-3 px-4">Heure</th>
									<th className="py-3 px-4">Auteur</th>
									<th className="py-3 px-4">Type</th>
									<th className="py-3 px-4">Texte original</th>
									<th className="py-3 px-4">Statut de diffusion</th>
									<th className="py-3 px-4">Raison / Diagnostique</th>
									<th className="py-3 px-4 text-right">Actions</th>
								</tr>
							</thead>
							<tbody>
								{logs.length === 0 ? (
									<tr>
										<td
											colSpan={7}
											className="py-12 text-center text-white/35 font-medium"
										>
											Aucune alerte n'a transité pour le moment.
										</td>
									</tr>
								) : (
									logs.map((log) => (
										<tr
											key={log.id}
											className="border-b border-white/5 hover:bg-white/[0.02] transition-colors duration-200"
										>
											{/* Time */}
											<td className="py-3.5 px-4 font-mono text-[11px] text-white/30 whitespace-nowrap">
												{new Date(log.timestamp).toLocaleTimeString([], {
													hour: "2-digit",
													minute: "2-digit",
													second: "2-digit",
												})}
											</td>
											{/* Author */}
											<td className="py-3.5 px-4 font-semibold text-white/90">
												{log.author}
											</td>
											{/* Media type */}
											<td className="py-3.5 px-4 whitespace-nowrap">
												<span className="inline-flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded text-[10px] font-medium border border-white/10">
													{log.type === "video" ? (
														<>
															<VideoIcon className="w-3 h-3 text-cyan-400" />
															Vidéo
														</>
													) : log.type === "react-player" ? (
														<>
															<Tv className="w-3 h-3 text-red-500 animate-pulse" />
															Media
														</>
													) : log.type === "iframe" ? (
														<>
															<Tv className="w-3 h-3 text-amber-500" />
															Embed
														</>
													) : log.type === "link" ? (
														<>
															<Tv className="w-3 h-3 text-indigo-400" />
															Lien (TikTok/IG)
														</>
													) : log.type === "console" ? (
														<>
															<FileText className="w-3 h-3 text-slate-400" />
															Log
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
											<td
												className="py-3.5 px-4 max-w-xs truncate text-white/50 font-sans"
												title={log.text}
											>
												{log.text || (
													<span className="italic text-white/20">- vide -</span>
												)}
											</td>
											{/* Status */}
											<td className="py-3.5 px-4">
												<span
													className={`px-2 py-0.5 rounded-full inline-block text-[10px] font-extrabold font-mono tracking-wider ${
														log.status === "approved"
															? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
															: log.status === "censored"
																? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
																: "bg-red-500/10 text-red-400 border border-red-500/25"
													}`}
												>
													{log.status.toUpperCase()}
												</span>
											</td>
											{/* Reason */}
											<td className="py-3.5 px-4 text-white/40 italic font-medium">
												{log.reason}
											</td>
											{/* Re-trigger action button */}
											<td className="py-3.5 px-4 text-right">
												{log.status === "approved" ||
												log.status === "censored" ? (
													<button
														onClick={() =>
															handleTriggerTest({
																authorName: log.author,
																text: log.text,
																type: log.type,
																mediaUrl: log.mediaUrl,
																alertStyle: config.alertStyle,
																neonColor: config.neonColor,
																duration: config.alertDuration,
															})
														}
														className="px-2.5 py-1 bg-indigo-600/10 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold rounded-lg transition duration-150 cursor-pointer inline-flex items-center gap-1"
														title="Re-diffuser l'alerte sur l'overlay"
													>
														<RefreshCw className="w-3 h-3" />
														Relancer
													</button>
												) : (
													<span className="text-[10px] text-white/20 font-mono select-none">
														Verrouillé
													</span>
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
