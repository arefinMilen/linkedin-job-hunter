// ─── Central Configuration ────────────────────────────────────────────────────
// Reads environment variables once and exports validated, typed config values.
// Every other module imports from here — never reads process.env directly.
// ──────────────────────────────────────────────────────────────────────────────

import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Required env vars ────────────────────────────────────────────────────────
const required = [
  "GEMINI_API_KEY",
  "APIFY_API_TOKEN",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌  Missing required environment variable: ${key}`);
    console.error(`   Copy .env.example → .env and fill in your secrets.`);
    process.exit(1);
  }
}

// ── Resume text (loaded once at startup) ─────────────────────────────────────
const resumePath = resolve(__dirname, "..", "resume.md");
let resumeText;
try {
  resumeText = readFileSync(resumePath, "utf-8");
} catch {
  console.error(`❌  Could not read resume at ${resumePath}`);
  process.exit(1);
}

// ── Exported config object ───────────────────────────────────────────────────
const config = Object.freeze({
  // Gemini
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash",

  // Apify
  apifyToken: process.env.APIFY_API_TOKEN,

  // Telegram
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,

  // Job search
  searchQueries: (
    process.env.SEARCH_QUERIES ||
    "remote software engineer,remote fullstack developer,remote next.js developer"
  )
    .split(",")
    .map((q) => q.trim())
    .filter(Boolean),
  matchThreshold: Number(process.env.MATCH_THRESHOLD) || 75,
  maxJobsPerQuery: Number(process.env.MAX_JOBS_PER_QUERY) || 25,
  location: process.env.LOCATION || "",

  // Resume
  resumeText,
});

export default config;
