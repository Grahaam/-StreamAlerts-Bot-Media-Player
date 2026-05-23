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

  public async connectBot(token: string, channelId: string) {
    await this.shutdown();

    if (!token || !channelId) {
      this.status = "disconnected";
      this.botUser = "";
      return;
    }

    this.status = "connecting";
    this.errorMsg = "";
    console.log(`🤖 Starting Discord Client login on channel: ${channelId}...`);

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
        console.log(`✅ discord.js connected as ${this.botUser}`);
      });

      this.client.on("error", (err) => {
        console.error("❌ Discord websocket exception:", err);
        this.status = "error";
        this.errorMsg = err.message || "Discord WebSocket exception";
      });

      this.client.on("messageCreate", async (message: Message) => {
        try {
          if (message.author.bot) return;
          if (message.channelId !== channelId) return;

          let resolvedType: "image" | "video" | "react-player" | "iframe" | "link" = "image";
          let mediaUrl = "";

          const attachment = message.attachments.first();
          if (attachment) {
            const sizeMB = attachment.size / (1024 * 1024);
            if (sizeMB > settingsManager.settings.mediaMaxSizeMB) {
              console.warn(`🛑 File size ${sizeMB.toFixed(2)}MB exceeds settings threshold: ${settingsManager.settings.mediaMaxSizeMB}MB`);
              logManager.addLog({
                author: message.author.username,
                text: message.content,
                type: "image",
                mediaUrl: attachment.url,
                status: "blocked",
                reason: `File size limit exceeded (${sizeMB.toFixed(2)}MB > ${settingsManager.settings.mediaMaxSizeMB}MB limit)`,
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
              console.warn(`🛑 Rejected unsupported attachment mimetype: ${mime}`);
              logManager.addLog({
                author: message.author.username,
                text: message.content,
                type: "image",
                mediaUrl: attachment.url,
                status: "blocked",
                reason: `Unsupported media format: ${mime || "unknown file extension"}`,
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
          }

          const textCheck = processBannedWords(message.content);
          if (textCheck.wasBlocked) {
            console.warn(`🛑 Blocked message from ${message.author.username} due to banned keyword`);
            logManager.addLog({
              author: message.author.username,
              text: message.content,
              type: resolvedType,
              mediaUrl: mediaUrl,
              status: "blocked",
              reason: "Blocked by text filtering rules (banned words matches).",
            });
            return;
          }

          let finalText = textCheck.processed;

          const alertId = Math.random().toString(36).substring(2, 11);
          const alertPayload = {
            id: alertId,
            authorName: message.member?.displayName || message.author.globalName || message.author.username,
            authorAvatar: message.author.displayAvatarURL({ forceStatic: false }) || "https://cdn.discordapp.com/embed/avatars/0.png",
            text: finalText,
            mediaUrl: mediaUrl,
            type: resolvedType,
            duration: settingsManager.settings.alertDuration,
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
            reason: textCheck.wasCensored ? "Contenu censuré par filtre de mots" : "Approuvé par filtre de mots",
          });

          globalThis.io.emit("new_alert", alertPayload);
          console.log(`🔔 New Alert broadcasted for streamer overlay! Author: ${alertPayload.authorName}`);

        } catch (msgErr) {
          console.error("❌ Exception inside messageCreate handler:", msgErr);
        }
      });

      await this.client.login(token);
    } catch (err: any) {
      console.error("❌ Discord client connection initial failure:", err);
      this.status = "error";
      this.errorMsg = err.message || "Failed client connection login.";
      this.botUser = "";
    }
  }

  public async shutdown() {
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (err) {
        console.error("⚠️ Failed destroying old discord ws connection:", err);
      }
      this.client = null;
    }
    this.status = "disconnected";
    this.botUser = "";
  }
}

export const botManager = new DiscordBotManager();
