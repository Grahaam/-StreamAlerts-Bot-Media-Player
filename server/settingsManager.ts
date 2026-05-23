import fs from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "settings.json");

export interface Settings {
  discordToken: string;
  channelId: string;
  alertDuration: number;
  bannedWords: string[];
  mediaMaxSizeMB: number;
  neonColor: string;
  alertStyle: "neon" | "glitch" | "cyberpunk" | "glass";
  bannedWordsAction: "block" | "censor";
  stopAlertShortcut: string;
}

export const defaultSettings: Settings = {
  discordToken: "",
  channelId: "",
  alertDuration: 8000,
  bannedWords: ["scam", "spam", "troll", "nsfw", "hacker", "fakebot"],
  mediaMaxSizeMB: 8,
  neonColor: "#6366f1",
  alertStyle: "neon",
  bannedWordsAction: "censor",
  stopAlertShortcut: "Escape",
};

export class SettingsManager {
  public settings: Settings = { ...defaultSettings };

  public loadSettings() {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
        const loaded = JSON.parse(raw);
        this.settings = { ...defaultSettings, ...loaded };
        console.log("⚙️ Settings loaded from filesystem.");
      } else {
        this.saveSettings(this.settings);
      }
    } catch (err) {
      console.error("⚠️ Failed to load settings, using defaults.", err);
    }
  }

  public saveSettings(newSettings: Settings) {
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(newSettings, null, 2), "utf-8");
      this.settings = { ...newSettings };
      console.log("⚙️ Settings saved successfully.");
    } catch (err) {
      console.error("⚠️ Failed to save settings on disk.", err);
    }
  }
}

export const settingsManager = new SettingsManager();
