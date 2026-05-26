import dotenv from "dotenv";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const envLocal = dotenv.config({ path: ".env.local" });
if (envLocal.error) {
  dotenv.config();
}

const commands = [
  new SlashCommandBuilder()
    .setName("alert")
    .setDescription("Trigger an overlay alert")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Text to show on the overlay")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("Optional image, video, or link URL")
        .setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("random")
    .setDescription("Trigger a random video alert")
    .addStringOption((option) =>
      option
        .setName("text")
        .setDescription("Optional text to show on the overlay")
        .setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show available commands"),
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Show bot status"),
].map((command) => command.toJSON());

const token = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN || "";
const applicationId = process.env.APPLICATION_ID || process.env.CLIENT_ID || "";
const rest = new REST({ version: "10" }).setToken(token);

async function registerCommands() {
  if (!applicationId || !token) {
    console.error("❌ Missing Discord credentials.");
    console.error("   Set one of:");
    console.error("   - DISCORD_TOKEN or DISCORD_BOT_TOKEN");
    console.error("   - APPLICATION_ID or CLIENT_ID");
    console.error("   See .env.example for the expected values.");
    process.exitCode = 1;
    return;
  }

  await rest.put(Routes.applicationCommands(applicationId), { body: commands });
  console.log("✅ Slash commands registered globally.");
}

registerCommands().catch((error: any) => {
  const status = error?.status;
  const code = error?.code;

  if (status === 401 || code === 0) {
    console.error("❌ Failed to register slash commands: the Discord token is invalid or is not a bot token.");
    console.error("   Rebuild your bot token in the Discord Developer Portal and paste it in DISCORD_TOKEN.");
  } else {
    console.error("❌ Failed to register slash commands:", error);
  }

  process.exitCode = 1;
});
