import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const SETTINGS_FILE = path.join(process.cwd(), "settings.json");
const ENV_FILE = path.join(process.cwd(), ".env");

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
  youtubeCookiesContent?: string;
  
  // Moderation Extras
  cooldownSeconds?: number;
  blockLinks?: boolean;
  blockNSFW?: boolean;
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
  youtubeCookiesContent: "",
  cooldownSeconds: 0,
  blockLinks: false,
  blockNSFW: false,
};

export class SettingsManager {
  public settings: Settings = { ...defaultSettings };

  public loadSettings() {
    try {
      dotenv.config();
      
      let loaded: Partial<Settings> = {};
      if (fs.existsSync(SETTINGS_FILE)) {
        const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
        loaded = JSON.parse(raw);
      }
      
      this.settings = { ...defaultSettings, ...loaded };
      
      const envToken = process.env.DISCORD_TOKEN;
      if (envToken) {
        this.settings.discordToken = envToken.replace(/^"|"$/g, "").trim();
      }

      const cookiesFile = path.join(process.cwd(), "cookies.txt");
      if (fs.existsSync(cookiesFile)) {
        this.settings.youtubeCookiesContent = fs.readFileSync(cookiesFile, "utf-8");
      }

      console.log("[Settings] Loaded (tokens from env)");
      
      if (!fs.existsSync(SETTINGS_FILE)) {
        this.saveSettings(this.settings);
      }
    } catch (err) {
      console.error("[Settings] Load error (using defaults)", err);
    }
  }

  public saveSettings(newSettings: Settings) {
    try {
      // split sensitive from public
      const { discordToken, youtubeCookiesContent, ...publicSettings } = newSettings;
      
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(publicSettings, null, 2), "utf-8");
      
      this.writeEnvVars({ DISCORD_TOKEN: discordToken });
      
      this.settings = { ...newSettings };
      
      console.log("[Settings] Saved successfully");
      
      this.syncCookiesFile();
    } catch (err) {
      console.error("[Settings] Save error", err);
    }
  }

  private writeEnvVars(vars: Record<string, string>) {
    try {
      let envContent = '';
      if (fs.existsSync(ENV_FILE)) {
        envContent = fs.readFileSync(ENV_FILE, "utf8");
      }

      for (const [key, value] of Object.entries(vars)) {
        const safeValue = `"${value.replace(/"/g, '\\"')}"`;
        const regex = new RegExp(`^${key}=.*$`, 'm');
        
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}=${safeValue}`);
        } else {
          envContent += `\n${key}=${safeValue}`;
        }
        process.env[key] = value;
      }
      
      fs.writeFileSync(ENV_FILE, envContent.trim() + "\n", "utf8");
    } catch (e) {
      console.error("[Settings] Env write error", e);
    }
  }

  private syncCookiesFile() {
    try {
      const cookiesFile = path.join(process.cwd(), "cookies.txt");
      const content = (this.settings.youtubeCookiesContent || "").trim();
      
      if (!content) {
        if (fs.existsSync(cookiesFile)) {
          fs.unlinkSync(cookiesFile);
        }
        return;
      }

      let finalContent = content;
      if (!finalContent.includes("# Netscape HTTP Cookie File")) {
        finalContent = "# Netscape HTTP Cookie File\n# Generated file - modifications will be overwritten\n\n" + finalContent;
      }
      
      fs.writeFileSync(cookiesFile, finalContent, "utf-8");
    } catch (err) {
      console.error("[Settings] Cookie sync error", err);
    }
  }
}

export const settingsManager = new SettingsManager();
