// ─── Telegram Notifier ────────────────────────────────────────────────────────
// Sends formatted job match alerts to a Telegram chat via the Bot API.
// Only jobs meeting the match threshold are sent.
// ──────────────────────────────────────────────────────────────────────────────

import TelegramBot from "node-telegram-bot-api";
import config from "./config.js";

const bot = new TelegramBot(config.telegramBotToken);

/**
 * Filter high-match jobs and send each as a Telegram notification.
 * @param {Array} evaluatedJobs — jobs enriched with matchScore, reasoning, etc.
 * @returns {Promise<{ sent: number, skipped: number }>}
 */
export async function notifyMatches(evaluatedJobs) {
  const highMatches = evaluatedJobs
    .filter((j) => j.matchScore >= config.matchThreshold)
    .sort((a, b) => b.matchScore - a.matchScore);

  if (highMatches.length === 0) {
    console.log(
      `📭  No jobs met the ${config.matchThreshold}% threshold. No alerts sent.`
    );
    return { sent: 0, skipped: evaluatedJobs.length };
  }

  console.log(
    `\n📬  ${highMatches.length} job(s) matched ≥ ${config.matchThreshold}%. Sending alerts…\n`
  );

  // Send summary header
  await sendMessage(buildSummaryHeader(highMatches.length, evaluatedJobs.length));

  let sent = 0;
  for (const job of highMatches) {
    try {
      await sendMessage(buildJobCard(job));
      sent++;
      // Small delay to avoid Telegram rate limits
      await sleep(500);
    } catch (err) {
      console.error(`   ⚠️  Failed to send alert for "${job.title}": ${err.message}`);
    }
  }

  console.log(`✅  Sent ${sent}/${highMatches.length} alert(s) to Telegram.\n`);
  return { sent, skipped: evaluatedJobs.length - highMatches.length };
}

/**
 * Send an instant Telegram notification for a single high-match job.
 * @param {Object} job
 */
export async function sendSingleAlert(job) {
  try {
    await sendMessage(buildJobCard(job));
    console.log(`   📱  Sent Telegram alert instantly for: "${job.title}"`);
  } catch (err) {
    console.error(`   ⚠️  Failed to send instant Telegram alert for "${job.title}": ${err.message}`);
  }
}

// ── Message builders ─────────────────────────────────────────────────────────

function buildSummaryHeader(matchCount, totalCount) {
  const now = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  });

  return [
    `🚀 *LinkedIn Job Hunter Report*`,
    `📅 ${now} (BST)`,
    ``,
    `📊 *${totalCount}* jobs scanned → *${matchCount}* high match(es)`,
    `🎯 Threshold: *${config.matchThreshold}%*`,
    `${"─".repeat(30)}`,
  ].join("\n");
}

function buildJobCard(job) {
  const stars = getScoreEmoji(job.matchScore);
  const highlights =
    job.highlights?.length > 0
      ? job.highlights.map((h) => `  • ${h}`).join("\n")
      : "  • No specific highlights";
  const gaps =
    job.gaps?.length > 0
      ? job.gaps.map((g) => `  ⚠️ ${g}`).join("\n")
      : "";

  const lines = [
    `${stars} *${job.matchScore}% Match*`,
    ``,
    `💼 *${escapeMarkdown(job.title)}*`,
    `🏢 ${escapeMarkdown(job.company)}`,
    `📍 ${escapeMarkdown(job.location)}`,
    job.postedAt ? `🕐 ${escapeMarkdown(job.postedAt)}` : "",
    ``,
    `📝 *Why it's a match:*`,
    `${escapeMarkdown(job.reasoning || "")}`,
    ``,
    `✅ *Matching Skills:*`,
    highlights,
  ];

  if (gaps) {
    lines.push(``, `⚠️ *Gaps:*`, gaps);
  }

  lines.push(``, `🔗 [View on LinkedIn](${job.url})`);

  return lines.filter(Boolean).join("\n");
}

function getScoreEmoji(score) {
  if (score >= 90) return "🌟🌟🌟";
  if (score >= 80) return "🌟🌟";
  if (score >= 75) return "🌟";
  return "⭐";
}

/**
 * Escape special Markdown V1 characters for Telegram.
 */
function escapeMarkdown(text) {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
}

// ── Transport ────────────────────────────────────────────────────────────────

async function sendMessage(text) {
  return bot.sendMessage(config.telegramChatId, text, {
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
