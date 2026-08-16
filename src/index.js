// ─── Main Orchestrator ────────────────────────────────────────────────────────
// Ties together scraping → evaluation → notification in a single pipeline.
// Designed to run as a cron job (GitHub Actions) or manually via `npm start`.
// ──────────────────────────────────────────────────────────────────────────────

import config from "./config.js";
import { scrapeJobs } from "./scraper.js";
import { evaluateJobs } from "./evaluator.js";
import { notifyMatches } from "./notifier.js";

async function main() {
  const startTime = Date.now();

  console.log("═".repeat(60));
  console.log("  🎯  LinkedIn Remote Job Hunter & Matcher Agent");
  console.log("  👤  Candidate: Md Samsul Arefin");
  console.log(`  🔎  Queries: ${config.searchQueries.join(" | ")}`);
  console.log(`  📊  Match Threshold: ${config.matchThreshold}%`);
  console.log("═".repeat(60));
  console.log();

  // ── Step 1: Scrape ─────────────────────────────────────────────────────────
  console.log("━━━ STEP 1/3 ━━━ Scraping LinkedIn Jobs ━━━━━━━━━━━━━━━━━━━━━");
  const jobs = await scrapeJobs();

  if (jobs.length === 0) {
    console.log("⚠️  No jobs found. Exiting early.");
    return;
  }

  // ── Step 2: Evaluate ───────────────────────────────────────────────────────
  console.log("━━━ STEP 2/3 ━━━ Evaluating with Gemini ━━━━━━━━━━━━━━━━━━━━━");
  const evaluatedJobs = await evaluateJobs(jobs);

  // ── Step 3: Notify ─────────────────────────────────────────────────────────
  console.log("━━━ STEP 3/3 ━━━ Sending Telegram Alerts ━━━━━━━━━━━━━━━━━━━━");
  const { sent, skipped } = await notifyMatches(evaluatedJobs);

  // ── Summary ────────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("═".repeat(60));
  console.log("  📊  Run Summary");
  console.log(`  ├─ Jobs scraped:   ${jobs.length}`);
  console.log(`  ├─ Jobs evaluated: ${evaluatedJobs.length}`);
  console.log(`  ├─ Alerts sent:    ${sent}`);
  console.log(`  ├─ Below threshold:${skipped}`);
  console.log(`  └─ Duration:       ${elapsed}s`);
  console.log("═".repeat(60));
}

main().catch((err) => {
  console.error("\n💥  Fatal error:", err);
  process.exit(1);
});
