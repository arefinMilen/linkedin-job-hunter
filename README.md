# 🎯 LinkedIn Remote Job Hunter & Matcher Agent

An automated, AI-powered job hunting pipeline that scrapes remote LinkedIn jobs, evaluates each against your resume using **Gemini 2.0 Flash**, and sends instant **Telegram** alerts when a high match (≥ 75%) is found.

Built to run daily via **GitHub Actions** — set it and forget it.

---

## ⚡ Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Apify      │────▶│  Gemini 2.0 Flash │────▶│  Telegram    │
│  (LinkedIn   │     │  (Resume Match   │     │  (Instant    │
│   Scraper)   │     │   Evaluation)    │     │   Alerts)    │
└─────────────┘     └──────────────────┘     └──────────────┘
       ▲                     ▲
       │                     │
   config.js ◄──── resume.md + .env
```

**Pipeline:** `Scrape → Evaluate → Notify`

1. **Scrape** — Uses [Apify's LinkedIn Jobs Scraper](https://apify.com/hMvNSpz3JnHgl5jkh) to pull remote job listings across multiple search queries.
2. **Evaluate** — Sends each job description + your resume to Gemini 2.0 Flash, which returns a structured JSON match score (0–100) with reasoning and skill highlights.
3. **Notify** — Jobs scoring ≥ threshold are formatted into rich cards and sent to your Telegram chat.

---

## 📂 Project Structure

```
├── .env.example                   # Environment variable template
├── .gitignore
├── resume.md                      # Your resume (Markdown)
├── README.md
├── package.json
├── .github/
│   └── workflows/
│       └── daily-hunter.yml       # Automated daily cron job
└── src/
    ├── config.js                  # Central config & validation
    ├── scraper.js                 # Apify LinkedIn scraper
    ├── evaluator.js               # Gemini AI match evaluator
    ├── notifier.js                # Telegram alert sender
    └── index.js                   # Main orchestrator
```

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/your-username/linkedin-job-hunter.git
cd linkedin-job-hunter
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Fill in your `.env` with:

| Variable | Where to get it |
|---|---|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `APIFY_API_TOKEN` | [Apify Console → Settings → Integrations](https://console.apify.com/account/integrations) |
| `TELEGRAM_BOT_TOKEN` | Message [@BotFather](https://t.me/BotFather) on Telegram → `/newbot` |
| `TELEGRAM_CHAT_ID` | Message [@userinfobot](https://t.me/userinfobot) on Telegram |

### 3. Customize Your Resume

Edit `resume.md` with your skills, experience, and projects. This is the source of truth the AI evaluator uses.

### 4. Run

```bash
npm start
```

---

## ⚙️ Configuration

All tunable via `.env`:

| Variable | Default | Description |
|---|---|---|
| `SEARCH_QUERIES` | `remote software engineer,...` | Comma-separated LinkedIn search queries |
| `MATCH_THRESHOLD` | `75` | Minimum score (0–100) to trigger alert |
| `MAX_JOBS_PER_QUERY` | `25` | Max jobs to scrape per query |
| `LOCATION` | *(empty = worldwide)* | Geographic filter |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Gemini model to use |

---

## 🤖 GitHub Actions (Automated Daily Runs)

The included workflow (`.github/workflows/daily-hunter.yml`) runs every day at **08:00 UTC**.

### Setup:

1. Go to your repo → **Settings → Secrets and variables → Actions**
2. Add these **Repository Secrets**:
   - `GEMINI_API_KEY`
   - `APIFY_API_TOKEN`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
3. (Optional) Add **Repository Variables** to customize:
   - `SEARCH_QUERIES`
   - `MATCH_THRESHOLD`
   - `MAX_JOBS_PER_QUERY`
4. You can also trigger it manually from the **Actions** tab → **Run workflow**

---

## 📬 Sample Telegram Alert

```
🌟🌟 85% Match

💼 Senior Full-Stack Engineer (Next.js / React)
🏢 TechCorp AI
📍 Remote (Worldwide)
🕐 2 days ago

📝 Why it's a match:
Strong alignment with candidate's Next.js App Router expertise
and AI integration experience. The role's focus on LLM-powered
features maps directly to Koolaai and Kraftize projects.

✅ Matching Skills:
  • Next.js (App Router)
  • React.js + TypeScript
  • Node.js backend
  • AI/LLM integration
  • PostgreSQL

🔗 View on LinkedIn
```

---

## 🛡️ Security Notes

- **Never commit `.env`** — it's gitignored by default.
- API keys in CI are stored as encrypted **GitHub Secrets**.
- The Telegram bot only sends messages to your configured `CHAT_ID`.

---

## 📜 License

MIT © Md Samsul Arefin
