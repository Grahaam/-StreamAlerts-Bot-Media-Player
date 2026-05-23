import { settingsManager } from "./settingsManager.js";

export function processBannedWords(text: string): { processed: string; wasCensored: boolean; wasBlocked: boolean } {
  let processed = text || "";
  let wasCensored = false;
  let wasBlocked = false;

  for (const word of settingsManager.settings.bannedWords) {
    if (!word || !word.trim()) continue;
    // Build check
    const escaped = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");

    if (regex.test(processed)) {
      if (settingsManager.settings.bannedWordsAction === "block") {
        wasBlocked = true;
        break;
      } else {
        processed = processed.replace(regex, (match) => "*".repeat(match.length));
        wasCensored = true;
      }
    }
  }

  return { processed, wasCensored, wasBlocked };
}
