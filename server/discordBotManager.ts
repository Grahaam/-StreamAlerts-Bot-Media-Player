import { Client, GatewayIntentBits, Message } from "discord.js";
import { settingsManager } from "./settingsManager.js";
import { logManager } from "./logManager.js";
import { processBannedWords } from "./bannedWords.js";
import { resolveMediaFromLink } from "./mediaParser.js";

const DEFAULT_COMMAND_PREFIX = "!";
const TEXT_ONLY_PLACEHOLDER_IMAGE =
	"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function getCommandPrefix() {
	return process.env.COMMAND_PREFIX || DEFAULT_COMMAND_PREFIX;
}

function parseCommand(content: string) {
	const prefix = getCommandPrefix();
	if (!content || !content.startsWith(prefix)) {
		return null;
	}

	const trimmedCommand = content.slice(prefix.length).trim();
	if (!trimmedCommand) {
		return null;
	}

	const [commandName, ...args] = trimmedCommand.split(/\s+/);
	return {
		commandName: commandName.toLowerCase(),
		text: args.join(" ").trim(),
	};
}

export class DiscordBotManager {
	private client: Client | null = null;
	public status: "disconnected" | "connecting" | "connected" | "error" =
		"disconnected";
	public errorMsg: string = "";
	public botUser: string = "";

	private getStatusText() {
		const prefix = getCommandPrefix();
		return [
			`🤖 Status: ${this.status}`,
			`🔧 Prefix: ${prefix}`,
			`👤 Bot: ${this.botUser || "not connected"}`,
			`📺 Channel: ${settingsManager.settings.channelId || "not configured"}`,
			`🛠️ Commands: ${prefix}alert, ${prefix}help, ${prefix}status`,
		].join("\n");
	}

	private async sendReply(message: Message, text: string) {
		try {
			await message.reply(text);
		} catch (err) {
			console.warn("⚠️ Failed to reply to Discord command:", err);
		}
	}

	private async emitAlert(payload: {
		authorName: string;
		authorAvatar: string;
		text: string;
		mediaUrl: string;
		type: "image" | "video" | "react-player" | "iframe" | "link";
		wasCensored: boolean;
		duration?: number;
	}) {
		const alertId = Math.random().toString(36).substring(2, 11);
		const alertPayload = {
			id: alertId,
			authorName: payload.authorName,
			authorAvatar: payload.authorAvatar,
			text: payload.text,
			mediaUrl: payload.mediaUrl,
			type: payload.type,
			duration: payload.duration || settingsManager.settings.alertDuration,
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
			status: payload.wasCensored ? "censored" : "approved",
			reason: payload.wasCensored
				? "Contenu censuré par filtre de mots"
				: "Approuvé par filtre de mots",
		});

		globalThis.io.emit("new_alert", alertPayload);
		console.log(
			`🔔 New Alert broadcasted for streamer overlay! Author: ${alertPayload.authorName}`,
		);
	}

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

					const parsedCommand = parseCommand(message.content);
					if (!parsedCommand) return;

					if (parsedCommand.commandName === "help") {
						await this.sendReply(
							message,
							[
								"🧭 Available commands:",
								`• ${getCommandPrefix()}alert <message or URL> — trigger an overlay alert`,
								`• ${getCommandPrefix()}status — show bot connection status`,
								`• ${getCommandPrefix()}help — show this help message`,
							].join("\n"),
						);
						return;
					}

					if (parsedCommand.commandName === "status") {
						await this.sendReply(message, this.getStatusText());
						return;
					}

					if (parsedCommand.commandName !== "alert") {
						await this.sendReply(
							message,
							`❓ Unknown command. Use ${getCommandPrefix()}help to see available commands.`,
						);
						return;
					}

					let resolvedType:
						| "image"
						| "video"
						| "react-player"
						| "iframe"
						| "link" = "image";
					let mediaUrl = "";
					let finalText = parsedCommand.text;
					let resolvedDuration: number | undefined = undefined;

					const attachment = message.attachments.first();
					if (attachment) {
						const sizeMB = attachment.size / (1024 * 1024);
						if (sizeMB > settingsManager.settings.mediaMaxSizeMB) {
							console.warn(
								`🛑 File size ${sizeMB.toFixed(2)}MB exceeds settings threshold: ${settingsManager.settings.mediaMaxSizeMB}MB`,
							);
							logManager.addLog({
								author: message.author.username,
								text: finalText,
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
							console.warn(
								`🛑 Rejected unsupported attachment mimetype: ${mime}`,
							);
							logManager.addLog({
								author: message.author.username,
								text: finalText,
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
							if (!finalText) {
								return;
							}
							mediaUrl = TEXT_ONLY_PLACEHOLDER_IMAGE;
						} else {
							const url = matches[0];
							const resolved = await resolveMediaFromLink(url);
							resolvedType = resolved.type;
							mediaUrl = resolved.mediaUrl;
							resolvedDuration = resolved.duration;
						}
					}

					const textCheck = processBannedWords(finalText);
					if (textCheck.wasBlocked) {
						console.warn(
							`🛑 Blocked message from ${message.author.username} due to banned keyword`,
						);
						logManager.addLog({
							author: message.author.username,
							text: finalText,
							type: resolvedType,
							mediaUrl: mediaUrl,
							status: "blocked",
							reason: "Blocked by text filtering rules (banned words matches).",
						});
						return;
					}

					await this.emitAlert({
						authorName:
							message.member?.displayName ||
							message.author.globalName ||
							message.author.username,
						authorAvatar:
							message.author.displayAvatarURL({ forceStatic: false }) ||
							"https://cdn.discordapp.com/embed/avatars/0.png",
						text: textCheck.processed,
						mediaUrl,
						type: resolvedType,
						wasCensored: textCheck.wasCensored,
						duration: resolvedDuration,
					});
				} catch (msgErr) {
					console.error("❌ Exception inside messageCreate handler:", msgErr);
				}
			});

			this.client.on("interactionCreate", async (interaction) => {
				try {
					if (!interaction.isChatInputCommand()) return;

					if (interaction.commandName === "help") {
						await interaction.reply({
							content: [
								"🧭 Available commands:",
								"• /alert <message> <url> — trigger an overlay alert",
								"• /status — show bot connection status",
								"• /help — show this help message",
							].join("\n"),
							ephemeral: true,
						});
						return;
					}

					if (interaction.commandName === "status") {
						await interaction.reply({
							content: this.getStatusText(),
							ephemeral: true,
						});
						return;
					}

					if (interaction.commandName !== "alert") {
						await interaction.reply({
							content: `❓ Unknown command. Use /help to see available commands.`,
							ephemeral: true,
						});
						return;
					}

					const messageText =
						interaction.options.getString("message")?.trim() || "";
					const url = interaction.options.getString("url")?.trim() || "";

					if (!messageText && !url) {
						await interaction.reply({
							content: "⚠️ Provide a message or a URL for /alert.",
							ephemeral: true,
						});
						return;
					}

					let resolvedType:
						| "image"
						| "video"
						| "react-player"
						| "iframe"
						| "link" = "image";
					let mediaUrl = "";

					if (url) {
						const resolved = await resolveMediaFromLink(url);
						resolvedType = resolved.type;
						mediaUrl = resolved.mediaUrl;
					} else {
						mediaUrl = TEXT_ONLY_PLACEHOLDER_IMAGE;
					}

					const textCheck = processBannedWords(messageText);
					if (textCheck.wasBlocked) {
						console.warn(
							`🛑 Blocked slash command from ${interaction.user.username} due to banned keyword`,
						);
						logManager.addLog({
							author: interaction.user.username,
							text: messageText,
							type: resolvedType,
							mediaUrl,
							status: "blocked",
							reason: "Blocked by text filtering rules (banned words matches).",
						});
						await interaction.reply({
							content: "🚫 Your alert was blocked by the banned words filter.",
							ephemeral: true,
						});
						return;
					}

					await this.emitAlert({
						authorName:
							interaction.member && "displayName" in interaction.member
								? interaction.member.displayName
								: interaction.user.globalName || interaction.user.username,
						authorAvatar:
							interaction.user.displayAvatarURL({ forceStatic: false }) ||
							"https://cdn.discordapp.com/embed/avatars/0.png",
						text: textCheck.processed,
						mediaUrl,
						type: resolvedType,
						wasCensored: textCheck.wasCensored,
					});

					await interaction.reply({
						content: "✅ Alert triggered.",
						ephemeral: true,
					});
				} catch (err) {
					console.error("❌ Exception inside interactionCreate handler:", err);
					try {
						if (interaction.isRepliable()) {
							await interaction.reply({
								content: "❌ Failed to process the slash command.",
								ephemeral: true,
							});
						}
					} catch {
						// ignore follow-up reply errors
					}
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
