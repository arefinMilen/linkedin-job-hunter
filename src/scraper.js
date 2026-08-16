// ─── LinkedIn Job Scraper (via Apify) ─────────────────────────────────────────
// Uses the `apify/linkedin-jobs-scraper` actor to pull remote job listings.
// Returns a normalized array of job objects for downstream evaluation.
// ──────────────────────────────────────────────────────────────────────────────

import { ApifyClient } from "apify-client";
import config from "./config.js";

const client = new ApifyClient({ token: config.apifyToken });

/**
 * Scrape LinkedIn for remote jobs matching the configured search queries.
 * @returns {Promise<Array<{
 *   title: string,
 *   company: string,
 *   location: string,
 *   description: string,
 *   url: string,
 *   postedAt: string
 * }>>}
 */
export async function scrapeJobs() {
  const allJobs = [];
  const seenUrls = new Set();

  for (const query of config.searchQueries) {
    console.log(`🔍  Scraping: "${query}" …`);

    try {
      const input = {
        urls: [buildSearchUrl(query)],
        count: config.maxJobsPerQuery,
      };

      const run = await client.actor("curious_coder/linkedin-jobs-scraper").call(input, {
        waitSecs: 180,
      });

      const { items } = await client.dataset(run.defaultDatasetId).listItems();

      for (const item of items) {
        const job = normalizeJob(item);
        if (job && !seenUrls.has(job.url)) {
          seenUrls.add(job.url);
          allJobs.push(job);
        }
      }

      console.log(
        `   ✅  Found ${items.length} listing(s) for "${query}" (${allJobs.length} total unique)`
      );
    } catch (err) {
      console.error(`   ⚠️  Scrape failed for "${query}": ${err.message}`);
    }
  }

  console.log(`\n📋  Total unique jobs scraped: ${allJobs.length}\n`);
  return allJobs;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Construct a LinkedIn job search URL with remote filter.
 */
function buildSearchUrl(query) {
  const params = new URLSearchParams({
    keywords: query,
    f_WT: "2", // Remote filter
    sortBy: "DD", // Most recent
  });
  if (config.location) {
    params.set("location", config.location);
  }
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

/**
 * Normalize a raw Apify item into our clean job object.
 * Returns null if essential fields are missing.
 */
function normalizeJob(item) {
  const title = item.title || item.jobTitle || "";
  const company =
    item.companyName || item.company || item.companyInfo?.name || "";
  const location = item.location || item.formattedLocation || "Remote";
  const description = item.description || item.descriptionText || "";
  const url = item.url || item.jobUrl || item.link || "";
  const postedAt = item.postedAt || item.publishedAt || item.listedAt || "";

  if (!title || !url) return null;

  return {
    title: title.trim(),
    company: company.trim(),
    location: location.trim(),
    description: description.trim().slice(0, 4000), // cap for LLM context
    url: url.trim(),
    postedAt: postedAt.toString().trim(),
  };
}
