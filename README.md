# AI Editorial Workspace — This Week in AI

Walkthrough README for the [FDE Intern Take Home Assignment](./FDE%20Intern%20Take%20Home%20Assignment%20_%20This%20Week%20in%20AI.md) submission (see **§10 Submissions**: Solution Live Link, GitHub Link, and a README that covers product decisions and why).

| Status | Detail |
|---|---|
| **Plan** | Approved (2026-11-02) |
| **Application code** | **M0–M6 verified** (through writing analyze / accept-reject APIs + UI; Gemini live call optional). M7–M8 not started. |
| **Screenshots / live URL** | Placeholders until product flows exist and are captured |

---

## Quick navigation

| Section | |
|---|---|
| [Submission links](#submission-links) | Live app + GitHub |
| [Startup / Setup Guide](#startup--setup-guide) | Run on a new machine |
| [Self-hosting](#self-hosting) | Free-tier deploy |
| [Product decisions](#product-decisions) | What we chose and why |
| [App screenshots](#app-screenshots) | UI walkthrough |
| [Features](#features) | Implemented vs planned |
| [Architecture](#architecture) | Stack summary |
| [Usage guide](#usage-guide) | Sources → brief → draft → writing |
| [Assignment deliverables](#assignment-deliverables) | PRD checklist |
| [Engineering notes](#engineering-notes) | LLM, ingestion, limits |
| [AI tools disclosure](#ai-tools-disclosure) | What AI did vs verified |
| [Documentation index](#documentation-index) | Full design docs |

---

## Submission links

Per assignment **§10 Submissions**:

| Item | Value |
|---|---|
| **Solution Live Link** | `_TBD after M8 deploy — placeholder_` |
| **GitHub Link** | [akshatnavlani/ThisWeekAI_Assignment](https://github.com/akshatnavlani/ThisWeekAI_Assignment) |
| **This README** | Product decisions, setup, self-hosting, screenshots |

Also required by **§7 Deliverables** (linked below): working app or local setup, product/engineering note, sample editorial, before/after writing example.

---

## Product overview

**AI Editorial Workspace** helps This Week in AI editors go from raw URLs/articles/tweets to an evidence-backed research brief and a polished ~300–500 word newsletter draft — with Hemingway-inspired writing assistance that keeps the writer in control.

| | |
|---|---|
| **Primary user** | Newsletter editor (founders / builders / operators audience) |
| **Core problem** | Finding sources is easy; discovering a *story worth telling* and turning it into clear, attributable writing is slow |
| **Product shape** | One unified local project — not two disconnected tools |

---

## Product decisions

Full ADRs: [`docs/DECISIONS.md`](./docs/DECISIONS.md) · Scope: [`docs/MVP_SCOPE.md`](./docs/MVP_SCOPE.md)

### Who is the primary user?

A This Week in AI newsletter editor who needs to separate facts from speculation, find an angle, and ship clear prose — without losing technical nuance.

### What problem did we prioritize?

**Story discovery + controlled drafting**, not a publishing CMS. The PRD values decision quality over feature count.

### Core workflow

```text
Sources (≥3 usable)
  → Research brief (facts vs analysis, evidence, angles)
  → Draft (starter draft default, or outline-only)
  → Optional per-section draft regenerate
  → Writing Assistant (highlight → explain → rewrite → accept/reject)
  → Compare original vs revised + metrics
```

### Decisions and why

| Decision | Choice | Why |
|---|---|---|
| Research ↔ Writing | **Unified project** (ADR-001) | Matches “raw info → polished draft”; sample editorial is a natural outcome |
| Persistence | **Local SQLite** (ADR-002, ADR-011) | Survives refresh; zero cloud DB for MVP; JSON blobs fit columns/`JSON1` without Mongo ops |
| vs Mongo/NoSQL | **Rejected for MVP** (ADR-011) | Nested LLM JSON ≠ document-DB product; we still need relational source↔claim links |
| Sources | **URL + paste mixed** (ADR-003) | Articles fetch+extract; failures → paste; never invent body text |
| Tweets | **Optional X API; else paste** (ADR-003, ADR-011) | No reliable free official tweet API; scraping is brittle/ToS-risky |
| Brief → draft | **Starter draft default + outline-only** (ADR-004) | Fast path for Part C; editors who want control can outline |
| Per-section regen | **Draft sections only** (ADR-008) | Improves the article; Writing Assistant handles sentence-level edits |
| Writing checks | **Hybrid:** complex / passive / filler (ADR-005) | Deterministic detect + LLM explain/rewrite; metrics are informational |
| Hemingway | **Inspired, not a clone** | Inline highlights + categories + metrics; plus accept/reject (PRD) |
| LLM | **Gemini only** (ADR-010) | Keys available; structured output; Groq deferred (no dual-provider abstraction) |
| App stack | **Next.js + Tailwind** (ADR-010) | One TypeScript monolith; fast delivery |
| UI design | **ui-ux-pro-max** curated system (ADR-010) | Light editorial UI; Libre Bodoni + Public Sans; no dark/glow/Inter cliché |
| Deploy | **Local first, then free PaaS** (ADR-006) | Avoid Vercel+file SQLite; use disk-backed host later |
| Explicitly out | Auth, cloud multi-project, brief section regen, multi-agent frameworks, jargon-as-4th-check | Keeps a small tool done well |

### How we’d measure usefulness

- Brief surfaces a non-obvious angle from ≥3 sources  
- Claims trace to real source links  
- Suggestions are rejectable; originals never silently overwritten  
- Sample piece is specific to founders/builders/operators — not a generic summary  

---

## App screenshots

> **Status:** App UI not built yet. After implementation, drop PNGs into `docs/screenshots/` and replace the placeholders below. Suggested captures:

| # | Screen | File (planned) | What it shows |
|---|---|---|---|
| 1 | Sources | `docs/screenshots/01-sources.png` | Adding ≥3 URLs/pastes; status chips (`ready` / `needs_content`) |
| 2 | Research brief | `docs/screenshots/02-research-brief.png` | Facts vs analysis, evidence links, newsletter angles |
| 3 | Draft | `docs/screenshots/03-draft.png` | Sectioned starter draft; section regenerate; mode toggle |
| 4 | Writing assist | `docs/screenshots/04-writing-assist.png` | Highlights, suggestion accept/reject, metrics |
| 5 | Compare | `docs/screenshots/05-compare.png` | Original vs revised |

### 1 — Sources

```text
[ Screenshot placeholder: 01-sources.png ]
```

### 2 — Research brief

```text
[ Screenshot placeholder: 02-research-brief.png ]
```

### 3 — Draft

```text
[ Screenshot placeholder: 03-draft.png ]
```

### 4 — Writing assist

```text
[ Screenshot placeholder: 04-writing-assist.png ]
```

### 5 — Original vs revised

```text
[ Screenshot placeholder: 05-compare.png ]
```

---

## Features

| Feature | Status |
|---|---|
| Next.js scaffold + design tokens + empty shell | **Verified (M0)** |
| SQLite schema + `GET`/`PATCH` `/api/projects/current` | **Verified (M1)** |
| Navigable workspace shell (stage stepper + placeholders) | **Verified (M2)** |
| Mixed source ingest (URL + paste; optional X; SSRF-safe) | **Verified (M3)** |
| Research brief + evidence attribution | **Verified (M4)** — unit/mocked; live Gemini optional |
| Starter draft / outline + section regen | **Verified (M5)** — unit/mocked; live Gemini optional |
| Writing Assistant (3 checks, accept/reject, metrics) | **Verified (M6)** — unit/mocked; live Gemini optional |
| Sample editorial + before/after artifacts | Planned (M7) |
| Free-tier self-host | Planned (M8) |

Only mark **Implemented** after the matching milestone is tested and verified (`docs/PROGRESS.md`).

---

## Architecture

| Layer | Technology | Alternative considered | Reason |
|---|---|---|---|
| Frontend + API | Next.js App Router (TypeScript) | Vite + Express | One repo, less glue |
| Database | SQLite file | Mongo, Postgres, Supabase | Local durable; simple; ADR-011 |
| LLM | Gemini Flash-class | Groq dual-provider | Quality + structured JSON; less complexity |
| Ingestion | Fetch + Readability | Headless browser / Firecrawl | Enough for MVP + paste fallback |
| UI | Tailwind + design-system tokens | Heavy component kits | Editorial, not dashboard |
| Deploy | Render / Railway / Fly (+ volume) | Vercel + file SQLite | Persistent disk |

Details: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) · Schema: [`docs/SCHEMA.md`](./docs/SCHEMA.md)

**AI vs deterministic**

- **Deterministic:** URL fetch/SSRF guards, Readability extract, writing detectors, metrics, suggestion overlap rules  
- **AI (Gemini):** research brief, draft/outline/section gen, explain + rewrite suggestions  

---

## Startup / Setup Guide

> **Honesty note:** M0–M6 verified on 2026-11-03: install/test/build, project/sources/research/draft/writing APIs, workspace shell, ingest, brief, draft generate/section regen, and writing analyze/accept-reject (mocked Gemini in tests) **PASS**. Live Gemini generate was **not** run in CI — set `GEMINI_API_KEY` + `GEMINI_MODEL` locally to try it. Sample editorial artifacts and deploy are **not** done yet (M7–M8). Tweet URL auto-fetch needs optional `X_BEARER_TOKEN`; otherwise paste.

### Prerequisites (new machine)

- **Node.js 20+** (verified with Node 24 / npm)  
- **npm** (lockfile: `package-lock.json`)  
- **Google AI Studio** API key ([Gemini](https://aistudio.google.com/)) — needed from M4 onward  
- Git  
- (Optional) X/Twitter bearer token for tweet URL auto-fetch  

### 1. Clone

```bash
git clone git@github.com:akshatnavlani/ThisWeekAI_Assignment.git
cd ThisWeekAI_Assignment
```

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | **Yes** | Gemini API access |
| `GEMINI_MODEL` | **Yes** | Flash-class model ID from AI Studio (do not use shut-down 2.0 Flash IDs) |
| `DATABASE_PATH` | No | SQLite path; default `./data/editorial.db` |
| `X_BEARER_TOKEN` | No | Optional tweet lookup; without it, paste tweet text |

**Never commit `.env` or real API keys.**

### 3. Install & run (development)

```bash
npm install
npm run dev
```

Open the URL printed by Next.js (typically `http://localhost:3000`).

### 4. Production build (local)

```bash
npm run build
npm run start
```

### 5. Database

`DATABASE_PATH` defaults to `./data/editorial.db`. On first DB open (e.g. `GET /api/projects/current`), Drizzle migrations under `drizzle/` apply automatically and a default project is bootstrapped if none exists. Do not commit `*.db` files.

```bash
# optional: regenerate SQL after schema edits
npm run db:generate

# unit/integration tests (temp SQLite files)
npm test
```

Quick API check while `npm run dev` is running:

```bash
curl http://localhost:3000/api/projects/current
```

### Troubleshooting (planned)

| Symptom | What to check |
|---|---|
| App won’t start / missing key | `GEMINI_API_KEY` set in `.env`; restart dev server |
| Brief generate blocked | Need **≥3 sources** with status `ready` (usable content) |
| URL fetch failed | Paywall/bot block → use **paste** for that source; URL kept for citation |
| Tweet URL empty | Set `X_BEARER_TOKEN` or paste tweet text |
| Gemini 429 | Rate limit — wait/retry; reduce regen spam; check AI Studio quotas |
| DB locked / missing | Ensure `data/` writable; delete DB only if you accept data loss |

---

## Self-hosting

Goal (ADR-006): **local E2E first**, then a free-tier host with a **persistent disk** for SQLite.

**Not recommended:** Vercel serverless + local SQLite file (ephemeral filesystem — data won’t stick).

### Recommended approach (Render / Railway / Fly)

1. Complete local setup and verify the full workflow.  
2. Create a **Node web service** on Render, Railway, or Fly.  
3. Attach a **persistent volume**; set `DATABASE_PATH` to a path on that volume (e.g. `/data/editorial.db`).  
4. Set env vars in the host dashboard: `GEMINI_API_KEY`, `GEMINI_MODEL`, optional `X_BEARER_TOKEN`.  
5. Build/start commands (intended):

```bash
npm install
npm run build
npm run start
```

6. Open the public URL; smoke-test: add sources → brief → draft → analyze.  
7. Put the URL in [Submission links](#submission-links).

### Security note for public demos

MVP has **no auth**. Anyone with the URL can use the workspace and your server-side Gemini quota. For a take-home demo: use a throwaway key, rate-limit if needed, or shut down after review. Disclose this in the product note.

### Alternative: Vercel + Turso

Only if you insist on Vercel: move persistence to **Turso/libSQL** (or similar) instead of a local file. That is a deliberate extra dependency — not the default plan.

---

## Usage guide

1. **Sources** — Add at least three articles/URLs (and/or pasted content). Fix any `needs_content` via paste.  
2. **Research** — Generate the brief. Review facts vs analysis, evidence links, angles. Edit lightly or full-regenerate.  
3. **Draft** — Pick an angle. Generate **starter draft** (default) or **outline only**. Regenerate weak **draft sections** if needed.  
4. **Writing** — Analyze. Review highlights and suggestions. Accept/reject individually. Compare original vs revised. Check metrics (informational, not a score to grind).  
5. **Ship artifacts** — Export/copy final ~300–500 word piece + before/after for submission docs.

---

## Assignment deliverables

Mapped to PRD **§7** and **§10**:

| Deliverable | Location / status |
|---|---|
| Working application | Local setup (above); live link TBD |
| Source code + README | This repo |
| Product & engineering note | `docs/PRODUCT_ENGINEERING_NOTE.md` — _planned M7_ (decisions also summarized here) |
| Sample editorial (300–500 words) | `docs/sample-editorial.md` — _planned M7_ |
| Before/after writing example | `docs/before-after-writing.md` — _planned M7_ |
| Setup + env vars | [Startup / Setup Guide](#startup--setup-guide) |
| Live link | [Submission links](#submission-links) |
| GitHub link | [Submission links](#submission-links) |

---

## Engineering notes

- **Evidence:** Claims carry `sourceIds` validated against stored sources; UI links only known URLs.  
- **Failures:** Bad URLs → `needs_content` + paste; malformed LLM JSON → validate + limited retry + clear error.  
- **Writing:** Detectors are unit-testable without network; LLM only for explanation/rewrite.  
- **Known limits:** Extraction won’t beat paywalls; tweets need paste or X token; free-tier Gemini rate limits apply; deployed demo is unauthenticated.  

More: [`docs/RISKS.md`](./docs/RISKS.md) · [`docs/TECHNICAL_REQUIREMENTS.md`](./docs/TECHNICAL_REQUIREMENTS.md)

---

## AI tools disclosure

| Area | Tools | Human responsibility |
|---|---|---|
| Planning / ADRs / architecture docs | Cursor agent | Review, decisions, approvals |
| Design system seed | ui-ux-pro-max skill | Curated overrides (light editorial; no Inter/dark-glow) |
| Implementation | TBD after authorization | Will list generated vs hand-written vs tested |

Update this section after each implementation milestone with what was **personally implemented, tested, and verified**.

---

## Documentation index

| Doc | Purpose |
|---|---|
| [`docs/MVP_SCOPE.md`](./docs/MVP_SCOPE.md) | Approved MVP |
| [`docs/DECISIONS.md`](./docs/DECISIONS.md) | ADR-001…011 |
| [`docs/TECHNICAL_REQUIREMENTS.md`](./docs/TECHNICAL_REQUIREMENTS.md) | FR/NFR + API |
| [`docs/DESIGN.md`](./docs/DESIGN.md) | UX |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | System design |
| [`docs/SCHEMA.md`](./docs/SCHEMA.md) | Data model |
| [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) | Milestones M0–M8 |
| [`docs/RISKS.md`](./docs/RISKS.md) | Risks |
| [`docs/PLANNING_AUDIT.md`](./docs/PLANNING_AUDIT.md) | Planning audit |
| [`docs/PROGRESS.md`](./docs/PROGRESS.md) | Live progress |
| [`design-system/this-week-in-ai-editorial/`](./design-system/this-week-in-ai-editorial/) | UI tokens |
| [`AGENTS.md`](./AGENTS.md) | Agent instructions |
| [Assignment PRD](./FDE%20Intern%20Take%20Home%20Assignment%20_%20This%20Week%20in%20AI.md) | Authoritative brief |

---

## License / course note

Take-home assignment for This Week in AI FDE Intern. Not production software.
