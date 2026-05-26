import express from "express";
import http, { createServer as createHttpServer } from "http";
import https from "https";
import { Server as SocketServer } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";

import { settingsManager, Settings } from "./server/settingsManager.js";
import { logManager } from "./server/logManager.js";
import { botManager } from "./server/discordBotManager.js";

dotenv.config();

const PORT = 3000;

// Server setup
async function runServer() {
  settingsManager.loadSettings();

  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  const httpServer = createHttpServer(app);
  // Socket.io
  const io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Global emitter for bot manager
  globalThis.io = io;

  // Connect bot if we have settings
  if (settingsManager.settings.discordToken && settingsManager.settings.channelId) {
    botManager.connectBot(settingsManager.settings.discordToken, settingsManager.settings.channelId).catch(() => {});
  }

  // Get settings
  app.get("/api/settings", (req, res) => {
    // Mask token
    const safeSettings = {
      ...settingsManager.settings,
      discordToken: settingsManager.settings.discordToken ? "••••••••••••••••••••" : "",
    };
    res.json(safeSettings);
  });

  // Save settings
  app.post("/api/settings", async (req, res) => {
    try {
      const incoming = req.body;
      const originalToken = settingsManager.settings.discordToken;
      const originalChannel = settingsManager.settings.channelId;

      const updatedSettings: Settings = {
        discordToken: incoming.discordToken === "••••••••••••••••••••" ? originalToken : incoming.discordToken || "",
        channelId: incoming.channelId || "",
        alertDuration: Number(incoming.alertDuration) || 8000,
        bannedWords: Array.isArray(incoming.bannedWords) ? incoming.bannedWords : [],
        mediaMaxSizeMB: Number(incoming.mediaMaxSizeMB) || 8,
        neonColor: incoming.neonColor || "#6366f1",
        alertStyle: incoming.alertStyle || "neon",
        bannedWordsAction: incoming.bannedWordsAction || "censor",
        stopAlertShortcut: incoming.stopAlertShortcut || "Escape",
        youtubeCookiesContent: incoming.youtubeCookiesContent || "",
      };

      settingsManager.saveSettings(updatedSettings);

      // Reconnect bot if settings changed
      if (
        updatedSettings.discordToken !== originalToken ||
        updatedSettings.channelId !== originalChannel
      ) {
        console.log("[Server] Settings changed, reconnecting Discord bot...");
        botManager.connectBot(updatedSettings.discordToken, updatedSettings.channelId).catch(() => {});
      }

      res.json({ success: true, settings: {
        ...updatedSettings,
        discordToken: updatedSettings.discordToken ? "••••••••••••••••••••" : "",
      }});
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to save settings" });
    }
  });

  // Logs
  app.get("/api/logs", (req, res) => {
    res.json(logManager.logs);
  });

  app.post("/api/logs/clear", (req, res) => {
    logManager.clearLogs();
    res.json({ success: true });
  });

  // Bot status
  app.get("/api/bot-status", (req, res) => {
    res.json({
      status: botManager.status,
      botUser: botManager.botUser,
      errorMsg: botManager.errorMsg,
    });
  });

  app.post("/api/bot-reconnect", async (req, res) => {
    try {
      await botManager.connectBot(settingsManager.settings.discordToken, settingsManager.settings.channelId);
      res.json({ success: true, status: botManager.status });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to reconnect" });
    }
  });

  // Test alert
  app.post("/api/trigger-test", (req, res) => {
    const { authorName, text, type, mediaUrl, alertStyle, neonColor, duration } = req.body;

    const testPayload = {
      id: "test_" + Math.random().toString(36).substring(2, 11),
      authorName: authorName || "Viewer_Random_99",
      authorAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=128&q=80",
      text: text || "Check out this clip!",
      mediaUrl: mediaUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1280&auto=format&fit=crop",
      type: type || "image",
      duration: duration || settingsManager.settings.alertDuration,
      neonColor: neonColor || settingsManager.settings.neonColor,
      alertStyle: alertStyle || settingsManager.settings.alertStyle,
      stopAlertShortcut: settingsManager.settings.stopAlertShortcut || "Escape",
      timestamp: Date.now(),
      isTest: true,
    };

    io.emit("new_alert", testPayload);
    res.json({ success: true, payload: testPayload });
  });

  // Skip alert
  app.post("/api/skip-alert", (req, res) => {
    io.emit("skip_alert");
    res.json({ success: true });
  });

  // Serve cached media
  app.get("/api/media-cache/:filename", (req, res) => {
    const filename = req.params.filename;
    if (filename.includes("..") || filename.includes("/")) {
       return res.status(400).send("Invalid filename");
    }
    const filepath = path.join(process.cwd(), "media_cache", filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).send("File not found");
    }
    
    res.sendFile(filepath);
  });

  // Queue management
  app.post("/api/queue/force-update", (req, res) => {
    io.emit("force_queue_update", req.body.queue);
    res.json({ success: true });
  });

  app.post("/api/queue/remove-item", (req, res) => {
    io.emit("remove_queue_item", req.body.id);
    res.json({ success: true });
  });

  // Proxy media to bypass CORS
  app.get("/api/proxy-media", (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send("No URL provided");

    const client = targetUrl.startsWith("https") ? https : http;

    let headersFromUrl: any = {};
    if (req.query.headers) {
      try {
        const decoded = Buffer.from(req.query.headers as string, 'base64').toString('utf-8');
        headersFromUrl = JSON.parse(decoded);
      } catch (e) {
        console.warn("Failed to parse headers from proxy-media URL");
      }
    }

    const options: any = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        "Referer": targetUrl.includes("tiktok") ? "https://www.tiktok.com/" : targetUrl.includes("instagram") ? "https://www.instagram.com/" : undefined,
        "Accept": "*/*",
        "Connection": "keep-alive",
        ...headersFromUrl
      }
    };

    if (req.headers.range) {
      options.headers["Range"] = req.headers.range;
    }

    // const logFile = path.resolve(process.cwd(), "proxy-debug.log");
    // const log = (msg: string) => {
    //    console.log(msg);
    //    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
    // };

    // log(`[Proxy Media] Requesting: ${targetUrl}`);
    // log(`[Proxy Media] Headers sent: ${JSON.stringify(options.headers)}`);

    const proxyReq = client.get(targetUrl, options, (proxyRes: any) => {
      // log(`[Proxy Media] Response from target: ${proxyRes.statusCode}`);
      // log(`[Proxy Media] Response headers: ${JSON.stringify(proxyRes.headers)}`);

      if (proxyRes.statusCode === 403 || proxyRes.statusCode >= 400) {
         // let body = "";
         // proxyRes.on('data', (c: any) => body += c);
         // proxyRes.on('end', () => {
         //    log(`[Proxy Media Error Body 403]: ${body.substring(0, 1000)}`);
         // });
      }

      // Handle redirects
      if ([301, 302, 303, 307, 308].includes(proxyRes.statusCode)) {
        let redirectUrl = proxyRes.headers.location;
        // console.log(`[Proxy Media] Redirecting to: ${redirectUrl?.substring(0, 100)}...`);
        if (redirectUrl) {
           if (!redirectUrl.startsWith('http')) {
              redirectUrl = new URL(redirectUrl, targetUrl).toString();
           }
           let newRedirectQuery = `?url=${encodeURIComponent(redirectUrl)}`;
           if (req.query.headers) {
             newRedirectQuery += `&headers=${req.query.headers}`;
           }
           res.writeHead(proxyRes.statusCode, {
             ...proxyRes.headers,
             "Location": `/api/proxy-media${newRedirectQuery}`,
             "Access-Control-Allow-Origin": "*",
           });
           return res.end();
        }
      }

      // Avoid forwarding problematic headers
      const headers = { ...proxyRes.headers };
      delete headers["access-control-allow-origin"];
      delete headers["access-control-allow-methods"];
      delete headers["access-control-allow-headers"];
      delete headers["access-control-expose-headers"];

      res.writeHead(proxyRes.statusCode || 200, {
        ...headers,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Range"
      });
      proxyRes.pipe(res);
    });

    proxyReq.on("error", (e: any) => {
      console.error("[Proxy Media] Proxy request error:", e);
      if (!res.headersSent) res.status(500).send("Proxy error");
    });

    req.on("close", () => {
      proxyReq.destroy();
    });
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

  // Start server
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] OBS overlay server running on port ${PORT}`);
  });
}

// Global socket emitter
declare global {
  var io: SocketServer;
}

runServer().catch((err) => {
  console.error("Fatal error starting server:", err);
});
