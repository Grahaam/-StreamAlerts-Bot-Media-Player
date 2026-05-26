export interface UIConfig {
	discordToken: string;
	channelId: string;
	alertDuration: number;
	bannedWords: string[];
	mediaMaxSizeMB: number;
	neonColor: string;
	alertStyle: "neon" | "glitch" | "cyberpunk" | "glass";
	bannedWordsAction: "block" | "censor";
	stopAlertShortcut?: string;
	iframeScale: number;
	iframeOffsetX: number;
	iframeOffsetY: number;
}

export interface AlertPayload {
	id: string;
	authorName: string;
	authorAvatar: string;
	text: string;
	mediaUrl: string;
	type: "image" | "video" | "react-player" | "iframe" | "link";
	provider?: string;
	duration: number;
	neonColor: string;
	alertStyle: "neon" | "glitch" | "cyberpunk" | "glass";
	stopAlertShortcut?: string;
	iframeScale: number;
	iframeOffsetX: number;
	iframeOffsetY: number;
	timestamp: number;
	isTest?: boolean;
}

export interface LogEntry {
	id: string;
	timestamp: number;
	author: string;
	text: string;
	type: "image" | "video" | "react-player" | "iframe" | "link" | "console";
	mediaUrl: string;
	status: "approved" | "blocked" | "censored" | "error" | "info";
	reason: string;
}

export interface Sparkle {
	id: number;
	dx: string;
	dy: string;
	size: string;
	delay: string;
	dur: string;
	bg: string;
}
