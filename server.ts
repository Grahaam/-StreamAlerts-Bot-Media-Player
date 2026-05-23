import express from "express";
import { createServer as createHttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

import { settingsManager, Settings } from "./server/settingsManager.js";
import { logManager } from "./server/logManager.js";
import { botManager } from "./server/discordBotManager.js";

dotenv.config();

const PORT = 3000;

// Setup server and express endpoints
async function runServer() {
	settingsManager.loadSettings();

	const app = express();
	app.use(express.json());

	const httpServer = createHttpServer(app);
	// Configure socket.io
	const io = new SocketServer(httpServer, {
		cors: {
			origin: "*",
			methods: ["GET", "POST"],
		},
	});

	// Share overlay emitter with bots
	globalThis.io = io;

	// Lazily connect bot if settings loaded token
	if (
		settingsManager.settings.discordToken &&
		settingsManager.settings.channelId
	) {
		botManager
			.connectBot(
				settingsManager.settings.discordToken,
				settingsManager.settings.channelId,
			)
			.catch(() => {});
	}

	// API - Get current Configuration Settings
	app.get("/api/settings", (req, res) => {
		// Mask token before sending
		const safeSettings = {
			...settingsManager.settings,
			discordToken: settingsManager.settings.discordToken
				? "••••••••••••••••••••"
				: "",
		};
		res.json(safeSettings);
	});

	// API - Save Configuration Settings
	app.post("/api/settings", async (req, res) => {
		try {
			const incoming = req.body;
			const originalToken = settingsManager.settings.discordToken;
			const originalChannel = settingsManager.settings.channelId;

			const updatedSettings: Settings = {
				discordToken:
					incoming.discordToken === "••••••••••••••••••••"
						? originalToken
						: incoming.discordToken || "",
				channelId: incoming.channelId || "",
				alertDuration: Number(incoming.alertDuration) || 8000,
				bannedWords: Array.isArray(incoming.bannedWords)
					? incoming.bannedWords
					: [],
				mediaMaxSizeMB: Number(incoming.mediaMaxSizeMB) || 8,
				neonColor: incoming.neonColor || "#6366f1",
				alertStyle: incoming.alertStyle || "neon",
				bannedWordsAction: incoming.bannedWordsAction || "censor",
				stopAlertShortcut: incoming.stopAlertShortcut || "Escape",
			};

			settingsManager.saveSettings(updatedSettings);

			// Trigger bot reconnect if token or channel changed
			if (
				updatedSettings.discordToken !== originalToken ||
				updatedSettings.channelId !== originalChannel
			) {
				console.log(
					"⚙️ Token or Channel ID altered: re-initialising Discord worker...",
				);
				botManager
					.connectBot(updatedSettings.discordToken, updatedSettings.channelId)
					.catch(() => {});
			}

			res.json({
				success: true,
				settings: {
					...updatedSettings,
					discordToken: updatedSettings.discordToken
						? "••••••••••••••••••••"
						: "",
				},
			});
		} catch (err: any) {
			res
				.status(500)
				.json({ error: err.message || "Failed storing configurations" });
		}
	});

	// API - Get Logs List
	app.get("/api/logs", (req, res) => {
		res.json(logManager.logs);
	});

	// API - Clear Logs
	app.post("/api/logs/clear", (req, res) => {
		logManager.clearLogs();
		res.json({ success: true });
	});

	// API - Get Discord status
	app.get("/api/bot-status", (req, res) => {
		res.json({
			status: botManager.status,
			botUser: botManager.botUser,
			errorMsg: botManager.errorMsg,
		});
	});

	// API - Reconnect bot manually
	app.post("/api/bot-reconnect", async (req, res) => {
		try {
			await botManager.connectBot(
				settingsManager.settings.discordToken,
				settingsManager.settings.channelId,
			);
			res.json({ success: true, status: botManager.status });
		} catch (err: any) {
			res
				.status(500)
				.json({ error: err.message || "Reconnect triggered failure." });
		}
	});

	// API - Trigger a Test simulation event
	app.post("/api/trigger-test", (req, res) => {
		const {
			authorName,
			text,
			type,
			mediaUrl,
			alertStyle,
			neonColor,
			duration,
		} = req.body;

		const testPayload = {
			id: "test_" + Math.random().toString(36).substring(2, 11),
			authorName: authorName || "Viewer_Random_99",
			authorAvatar:
				"https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=128&q=80",
			text:
				text ||
				"Regardez ce clip incroyable que je viens de faire sur le stream de ce soir ! 🔥",
			mediaUrl:
				mediaUrl ||
				"https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1280&auto=format&fit=crop",
			type: type || "image",
			duration: duration || settingsManager.settings.alertDuration,
			neonColor: neonColor || settingsManager.settings.neonColor,
			alertStyle: alertStyle || settingsManager.settings.alertStyle,
			stopAlertShortcut: settingsManager.settings.stopAlertShortcut || "Escape",
			timestamp: Date.now(),
			isTest: true,
		};

		io.emit("new_alert", testPayload);

		// Add to log for history
		logManager.addLog({
			author: testPayload.authorName,
			text: testPayload.text,
			type: testPayload.type,
			mediaUrl: testPayload.mediaUrl,
			status: "approved",
			reason: "Simulation de test déclenchée par l'utilisateur",
		});
		res.json({ success: true, payload: testPayload });
	});

	// API - Skip the currently playing alert
	app.post("/api/skip-alert", (req, res) => {
		io.emit("skip_alert");
		res.json({ success: true });
	});

	// Integrate Vite for development, or serve built static files for production
	if (process.env.NODE_ENV !== "production") {
		const vite = await createViteServer({
			server: { middlewareMode: true },
			appType: "spa",
		});
		app.use(vite.middlewares);
	} else {
		const distPath = path.join(process.cwd(), "dist");
		app.use(express.static(distPath));
		app.get("*", (req, res) => {
			res.sendFile(path.join(distPath, "index.html"));
		});
	}

	// Start the composite Server
	httpServer.listen(PORT, "0.0.0.0", () => {
		console.log(`🚀 Stream OBS server active on port ${PORT}`);
		console.log(`📡 WebSocket server mapped. Client connections ready.`);
	});
}

// Global scope Socket emitter representation helper
declare global {
	var io: SocketServer;
}

runServer().catch((err) => {
	console.error("FATAL: Failed to initiate unified application container", err);
});
