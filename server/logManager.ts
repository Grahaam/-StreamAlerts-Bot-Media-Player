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

export class LogManager {
  public logs: LogEntry[] = [];

  public addLog(log: Omit<LogEntry, "id" | "timestamp">) {
    const entry: LogEntry = {
      ...log,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: Date.now(),
    };
    this.logs.unshift(entry);
    if (this.logs.length > 100) this.logs.pop();
  }

  public clearLogs() {
    this.logs = [];
  }
}

export const logManager = new LogManager();
