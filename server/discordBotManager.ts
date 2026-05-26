import { Client, GatewayIntentBits, Message } from "discord.js";
import { settingsManager } from "./settingsManager.js";
import { logManager } from "./logManager.js";
import { processBannedWords } from "./bannedWords.js";
import { resolveMediaFromLink } from "./mediaParser.js";

export class DiscordBotManager {
  private client: Client | null = null;
  public status: "disconnected" | "connecting" | "connected" | "error" = "disconnected";
  public errorMsg: string = "";
  public botUser: string = "";
  private lastUserRequestTimes: Record<string, number> = {};

  public async connectBot(token: string, channelId: string) {
    await this.shutdown();

    if (!token || !channelId) {
      this.status = "disconnected";
      this.botUser = "";
      return;
    }

    this.status = "connecting";
    this.errorMsg = "";
    console.log(`[Discord] Logging in for channel: ${channelId}...`);

    try {
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
        ],
      });

      this.client.once("ready", () => {
        this.status = "connected";
        this.botUser = this.client?.user?.tag || "Unknown Bot";
        this.errorMsg = "";
        console.log(`[Discord] Connected as ${this.botUser}`);
      });

      this.client.on("error", (err) => {
        console.error("[Discord] Connection error:", err);
        this.status = "error";
        this.errorMsg = err.message || "Discord connection error";
      });

      this.client.on("messageCreate", async (message: Message) => {
        try {
          if (message.author.bot) return;
          if (message.channelId !== channelId) return;

          const cooldown = settingsManager.settings.cooldownSeconds || 0;
          if (cooldown > 0) {
            const lastTime = this.lastUserRequestTimes[message.author.id] || 0;
            const now = Date.now();
            const diff = (now - lastTime) / 1000;
            if (diff < cooldown) {
              console.warn(`[Discord] Cooldown active for ${message.author.username}`);
              logManager.addLog({
                author: message.author.username,
                text: message.content,
                type: "image",
                mediaUrl: "",
                status: "blocked",
                reason: `Cooldown (wait ${Math.ceil(cooldown - diff)}s)`,
              });
              return;
            }
          }
          this.lastUserRequestTimes[message.author.id] = Date.now();

          let resolvedType: "image" | "video" | "react-player" | "iframe" | "link" = "image";
          let mediaUrl = "";
          let mediaDuration: number | undefined;
          let mediaProvider: string | undefined;
          let mediaYtDlpError: string | undefined;

          const attachment = message.attachments.first();
          if (attachment) {
            const sizeMB = attachment.size / (1024 * 1024);
            if (sizeMB > settingsManager.settings.mediaMaxSizeMB) {
              console.warn(`[Discord] File too large (${sizeMB.toFixed(1)}MB)`);
              logManager.addLog({
                author: message.author.username,
                text: message.content,
                type: "image",
                mediaUrl: attachment.url,
                status: "blocked",
                reason: `File too large (${sizeMB.toFixed(1)}MB > ${settingsManager.settings.mediaMaxSizeMB}MB)`,
              });
              return;
            }

            const mime = (attachment.contentType || "").toLowerCase();
            const ext = attachment.url.split("?")[0].toLowerCase();
            const isVideo =
              mime.startsWith("video/") ||
              ext.endsWith(".mp4") ||
              ext.endsWith(".webm") ||
              ext.endsWith(".mov") ||
              ext.endsWith(".ogg");

            const isImage =
              mime.startsWith("image/") ||
              ext.endsWith(".png") ||
              ext.endsWith(".jpg") ||
              ext.endsWith(".jpeg") ||
              ext.endsWith(".gif") ||
              ext.endsWith(".webp");

            if (!isVideo && isImage) {
              resolvedType = "image";
              mediaUrl = attachment.url;
            } else if (isVideo) {
              resolvedType = "video";
              mediaUrl = attachment.url;
            } else {
              console.warn(`[Discord] Unsupported file type: ${mime}`);
              logManager.addLog({
                author: message.author.username,
                text: message.content,
                type: "image",
                mediaUrl: attachment.url,
                status: "blocked",
                reason: `Unsupported format: ${mime || "unknown"}`,
              });
              return;
            }
          } else {
            const urlRegex = /(https?:\/\/[^\s]+)/gi;
            const matches = message.content.match(urlRegex);
            if (!matches || matches.length === 0) {
              return;
            }

            const url = matches[0];
            const resolved = await resolveMediaFromLink(url);
            resolvedType = resolved.type;
            mediaUrl = resolved.mediaUrl;
            mediaProvider = resolved.provider;
            mediaYtDlpError = resolved.ytDlpError;
            if (resolved.duration) {
              mediaDuration = resolved.duration;
            }
          }

          const textCheck = processBannedWords(message.content);
          if (textCheck.wasBlocked) {
            console.warn(`[Discord] Message from ${message.author.username} blocked (banned word)`);
            logManager.addLog({
              author: message.author.username,
              text: message.content,
              type: resolvedType,
              mediaUrl: mediaUrl,
              status: "blocked",
              reason: "Blocked (banned words)",
            });
            return;
          }

          let finalText = textCheck.processed;
          const urlRegex = /(https?:\/\/[^\s]+)/gi;
          const matches = finalText.match(urlRegex) || [];

          if (matches.length > 0 && message.attachments.size === 0) {
            finalText = finalText.replace(matches[0], "").trim();
          }

          if (settingsManager.settings.blockLinks) {
            const remainingMatches = finalText.match(urlRegex) || [];
            
            if (remainingMatches.length > 0) {
              console.warn(`[Discord] Message from ${message.author.username} blocked (extra links)`);
              logManager.addLog({
                author: message.author.username,
                text: message.content,
                type: resolvedType,
                mediaUrl: mediaUrl,
                status: "blocked",
                reason: "Links not allowed",
              });
              return;
            }
          }

          if (settingsManager.settings.blockNSFW) {
            const hasSpoilerAttachment = message.attachments.some((a) => a.spoiler);
            const hasNSFWText = finalText.toLowerCase().includes("nsfw");

            if (hasSpoilerAttachment || hasNSFWText) {
              console.warn(`[Discord] Message from ${message.author.username} blocked (NSFW/Spoiler)`);
              logManager.addLog({
                author: message.author.username,
                text: message.content,
                type: resolvedType,
                mediaUrl: mediaUrl,
                status: "blocked",
                reason: "NSFW/Spoiler detected",
              });
              return;
            }
          }

          const alertId = Math.random().toString(36).substring(2, 11);
          const alertPayload = {
            id: alertId,
            authorName: message.member?.displayName || message.author.globalName || message.author.username,
            authorAvatar: message.author.displayAvatarURL({ forceStatic: false }) || "https://cdn.discordapp.com/embed/avatars/0.png",
            text: finalText,
            mediaUrl: mediaUrl,
            type: resolvedType,
            provider: mediaProvider,
            ytDlpError: mediaYtDlpError,
            duration: mediaDuration || settingsManager.settings.alertDuration,
            neonColor: settingsManager.settings.neonColor,
            alertStyle: settingsManager.settings.alertStyle,
            stopAlertShortcut: settingsManager.settings.stopAlertShortcut || "Escape",
            timestamp: Date.now(),
          };

          logManager.addLog({
            author: alertPayload.authorName,
            text: alertPayload.text,
            type: alertPayload.type,
            mediaUrl: alertPayload.mediaUrl,
            status: textCheck.wasCensored ? "censored" : "approved",
            reason: alertPayload.ytDlpError ? `Iframe fallback (yt-dlp error: ${alertPayload.ytDlpError.substring(0, 50)}...)` : (textCheck.wasCensored ? "Text censored" : "Approved"),
          });

          globalThis.io.emit("new_alert", alertPayload);
          console.log(`[Alerts] New alert from ${alertPayload.authorName}`);

        } catch (msgErr) {
          console.error("[Discord] Message handler error:", msgErr);
        }
      });

      await this.client.login(token);
    } catch (err: any) {
      console.error("[Discord] Login failed:", err);
      this.status = "error";
      this.errorMsg = err.message || "Failed to login";
      this.botUser = "";
    }
  }

  public async shutdown() {
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (err) {
        console.error("[Discord] Shutdown error:", err);
      }
      this.client = null;
    }
    this.status = "disconnected";
    this.botUser = "";
  }
}

export const botManager = new DiscordBotManager();
