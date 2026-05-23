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
}

export interface AlertPayload {
  id: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  mediaUrl: string;
  type: "image" | "video" | "react-player" | "iframe" | "link";
  duration: number;
  neonColor: string;
  alertStyle: "neon" | "glitch" | "cyberpunk" | "glass";
  stopAlertShortcut?: string;
  timestamp: number;
  isTest?: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  author: string;
  text: string;
  type: "image" | "video" | "react-player" | "iframe" | "link";
  mediaUrl: string;
  status: "approved" | "blocked" | "censored" | "error";
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
