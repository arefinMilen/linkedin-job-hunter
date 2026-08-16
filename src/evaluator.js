// ─── Job–Resume Evaluator (Gemini 2.0 Flash) ─────────────────────────────────
// Sends each job + resume to Gemini and asks for a structured match evaluation.
// Returns an enriched job object with matchScore, reasoning, and highlights.
// ──────────────────────────────────────────────────────────────────────────────

import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "./config.js";
import { sendSingleAlert } from "./notifier.js";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const model = genAI.getGenerativeModel({ model: config.geminiModel });

/**
 * Evaluate a batch of jobs against the candidate resume.
 * @param {Array} jobs — normalized job objects from the scraper
 * @returns {Promise<Array>} — jobs enriched with matchScore, reasoning, highlights
 */
export async function evaluateJobs(jobs) {
  const results = [];
  const total = jobs.length;

  for (let i = 0; i < total; i++) {
    const job = jobs[i];
    const progress = `[${i + 1}/${total}]`;

    try {
      console.log(`🤖  ${progress} Evaluating: ${job.title} @ ${job.company}`);
      const evaluation = await evaluateSingleJob(job);
      const enrichedJob = { ...job, ...evaluation };
      results.push(enrichedJob);

      const icon = evaluation.matchScore >= config.matchThreshold ? "🟢" : "⚪";
      console.log(`   ${icon}  Score: ${evaluation.matchScore}%`);

      // Send Telegram alert INSTANTLY if job matches threshold
      if (evaluation.matchScore >= config.matchThreshold) {
        await sendSingleAlert(enrichedJob);
      }
    } catch (err) {
      console.error(
        `   ❌  Evaluation failed for "${job.title}": ${err.message}`
      );
      results.push({ ...job, matchScore: 0, reasoning: "Evaluation failed", highlights: [] });
    }

    // Rate-limit: 12s delay between requests to stay strictly within Gemini 5 req/min quota
    if (i < total - 1) {
      await sleep(12000);
    }
  }

  return results;
}

// ── Core evaluation ──────────────────────────────────────────────────────────

async function evaluateSingleJob(job, retries = 3) {
  const prompt = buildPrompt(job);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      });

      const text = result.response.text();
      return parseEvaluation(text);
    } catch (err) {
      const isRateLimit = err.message?.includes("429") || err.message?.includes("Quota") || err.message?.includes("RESOURCE_EXHAUSTED");
      if (isRateLimit && attempt < retries) {
        const waitTime = attempt * 15000;
        console.log(`   ⏳  Rate limit hit. Waiting ${waitTime / 1000}s before retry ${attempt}/${retries}...`);
        await sleep(waitTime);
        continue;
      }
      throw err;
    }
  }
}

// ── Prompt engineering ───────────────────────────────────────────────────────

function buildPrompt(job) {
  return `You are an expert tech recruiter AI. Evaluate how well the CANDIDATE matches the JOB POSTING below.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CANDIDATE RESUME:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${config.resumeText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JOB POSTING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description:
${job.description}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Analyze skill overlap, experience relevance, project alignment, and seniority fit.
2. Return ONLY a JSON object (no markdown, no code fences) with these exact keys:
   - "matchScore": integer 0–100 representing overall match percentage
   - "reasoning": 2–3 sentence explanation of the score
   - "highlights": array of 3–5 strings — specific matching skills/experiences
   - "gaps": array of 0–3 strings — notable missing requirements (if any)`;
}

// ── Response parsing ─────────────────────────────────────────────────────────

function parseEvaluation(text) {
  try {
    // Strip any accidental markdown code fences
    const cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      matchScore: clamp(Number(parsed.matchScore) || 0, 0, 100),
      reasoning: String(parsed.reasoning || "No reasoning provided."),
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
    };
  } catch {
    // If JSON parsing fails, try to extract a score from raw text
    const scoreMatch = text.match(/(\d{1,3})\s*%/);
    return {
      matchScore: scoreMatch ? clamp(Number(scoreMatch[1]), 0, 100) : 0,
      reasoning: text.slice(0, 300),
      highlights: [],
      gaps: [],
    };
  }
}

// ── Utilities ────────────────────────────────────────────────────────────────

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
