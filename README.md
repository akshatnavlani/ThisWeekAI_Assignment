# This Week in AI — Editorial Workspace

Take-home for the [FDE Intern assignment](./FDE%20Intern%20Take%20Home%20Assignment%20_%20This%20Week%20in%20AI.md).

A local-first workspace that takes messy sources and walks an editor through research, a newsletter draft, and sentence-level polish — without surrendering control of the prose.

| | |
|---|---|
| **Live app** | [this-week-in-ai-editorial.onrender.com](https://this-week-in-ai-editorial.onrender.com) |
| **Source** | [github.com/akshatnavlani/ThisWeekAI_Assignment](https://github.com/akshatnavlani/ThisWeekAI_Assignment) |

---

## What this is for

This Week in AI editors don’t struggle to find links. They struggle to find a *story* — something specific enough for founders and builders, grounded in sources, written clearly without sanding off the technical edge.

So the product is one continuous project, not two demos glued together:

1. **Sources** — get usable text in (URL, paste, or both)
2. **Research** — separate facts from analysis, keep evidence linked, surface angles
3. **Compose** — draft the piece, then tighten sentences with accept/reject suggestions

If that path works, the sample editorial and before/after writing examples fall out of the tool instead of being invented afterward.

---

## Walkthrough

### 1. Sources

Add at least three usable sources. Articles are fetched and extracted; if a site blocks us (paywall, bot wall, 403), the URL is kept for citation and you paste the body. We never invent article text on a failed fetch.

Tweets are the awkward case. Optional `X_BEARER_TOKEN` uses the official X API first; if that isn’t configured (or fails), we fall back to [linktext](https://linktext.vercel.app) extract for public tweet text, author, and images. If both fail, paste the text and keep the URL for citation.

Sources can carry an og:image or an uploaded image for later export. Status chips make failures obvious (`ready` vs `needs_content`) so you aren’t guessing why research won’t start.

### 2. Research brief

Once three sources are ready, generate a brief. The brief is structured on purpose:

- **Facts vs analysis** — so the editor can see what the sources support versus what we’re inferring
- **Evidence links** — claims store real `sourceIds`; the UI only links to sources that exist
- **Angles** — one or more newsletter directions, not a generic “AI is changing everything” summary

You can light-edit the brief or fully regenerate it. We deliberately did **not** build per-section regen on the brief — that complexity belongs in the draft, where rewriting a section actually ships words.

Sources are treated as a corpus, not as verified truth. The UI is honest about that.

### 3. Compose

Pick an angle, then start from a **blank canvas** or a **starter draft**. Outline-only mode went away: it looked too much like a thin starter and confused the handoff.

Compose is one stage with two modes:

- **Drafting** — freeform sections (add, remove, reorder, optional generate-with-purpose). Live metrics sit alongside the canvas.
- **Writing assist** — run the hybrid checks, review highlights, accept or reject rewrites, compare against the original snapshot.

Changing the angle clears the body and suggestions (with confirmation) and returns you to Blank/Starter. The brief stays. That matches how editors actually pivot: keep the research, throw out the draft shape.

Export Markdown or PDF when you’re done. 

---

## Product decisions (and why)

Full ADRs live in [`docs/DECISIONS.md`](./docs/DECISIONS.md). The ones that shaped the submission:

**One project, not two tools.**  
The PRD asks for research *and* writing, and leaves the relationship open. A unified flow is a stronger product answer than a research paste-bin plus a separate Hemingway toy. The sample editorial becomes a natural output of the path, not a side quest. (ADR-001)

**Local SQLite, no auth.**  
Refresh mid-flow is a demo killer. A single durable project on disk survives that without cloud DB cost or fake multi-tenant scaffolding. Hosted multi-project was an explicit stretch we did not take. Nested LLM JSON in columns does not mean we needed Mongo. (ADR-002, ADR-011)

**Mixed ingest, paste as first-class recovery.**  
Fetch+Readability covers a lot of articles. When it doesn’t, paste keeps the citation URL and the editor moving. Inventing body text on failure would poison the brief. (ADR-003)

**Blank or Starter — then freeform sections.**  
Fixed six-section Part C shapes blocked real editing. Editors need to add/remove/reorder, and generate only when they ask (purpose required only if Generate is checked). Drafting and writing share one Compose surface so export/metrics aren’t duplicated. (ADR-019)

**Hybrid writing assist, not “optimize the Flesch score.”**  
Detectors find spans (complex, jargon, passive, adverb, filler, weasel). Gemini explains and proposes rewrites. Overlaps resolve with a fixed priority. Accept/reject is human-gated; the original snapshot is preserved. Metrics are informational — readability scoring even strips markdown link URLs so a sources list doesn’t clamp Flesch to zero. (ADR-005, ADR-018)

**Gemini only.**  
Keys were available, structured JSON worked, and a dual-provider abstraction for a hypothetical Groq path would have been ceremony. (ADR-010)

**Docker + SQLite volume for deploy.**  
Same image locally (Compose) and on Render with a disk at `/data`. Vercel + file SQLite is a footgun on an ephemeral filesystem. One instance only — SQLite is not multi-replica safe. The public demo has **no auth**; treat the Gemini key as burnable. (ADR-015)

**What we cut on purpose**  
Auth,Multi Project support, multi-tenant cloud projects, brief section regen, LangChain/multi-agent frameworks,Inter/dark-glow “AI product” UI. The goal was a small tool that completes the editorial loop well.

---

## How we’d judge if it worked

- The brief surfaces an angle you couldn’t get from one source alone  
- Claims open real source links  
- Bad writing suggestions are easy to reject; nothing silently rewrites the draft  
- The finished piece sounds like something founders/builders would actually read

Artifacts from that bar:

- Product & engineering note — [`docs/PRODUCT_ENGINEERING_NOTE.md`](./docs/PRODUCT_ENGINEERING_NOTE.md)
- Sample editorial — [`docs/sample-editorial.md`](./docs/sample-editorial.md)
- Before / after writing — [`docs/before-after-writing.md`](./docs/before-after-writing.md)

---

## Run it locally

**Needs:** Node 20+, npm, a Gemini API key from [Google AI Studio](https://aistudio.google.com/). Use a Flash-class model that supports `generateContent` (not Live/WebSocket-only IDs).

```bash
git clone git@github.com:akshatnavlani/ThisWeekAI_Assignment.git
cd ThisWeekAI_Assignment
cp .env.example .env
# set GEMINI_API_KEY and GEMINI_MODEL
npm install
npm run dev
```

Open the URL Next prints (usually `http://localhost:3000`).

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Server-side only |
| `GEMINI_MODEL` | Yes | Flash-class `generateContent` model |
| `DATABASE_PATH` | No | Default `./data/editorial.db` |
| `X_BEARER_TOKEN` | No | Official X enrichment first; linktext then paste if missing/failing |

SQLite and uploads live under `data/` (gitignored). Migrations run on first open.

```bash
npm test
npm run build && npm run start
```

### Docker (same path as production)

```bash
docker compose up --build
# http://localhost:3000 — SQLite on ./data via DATABASE_PATH=/data/editorial.db
```

Render blueprint: [`render.yaml`](./render.yaml). Attach a persistent disk at `/data`, set the Gemini env vars in the dashboard, run a **single** instance.

---

## Stack in one glance

| Layer | Choice | Why |
|---|---|---|
| App | Next.js App Router + TypeScript | One TypeScript surface for UI and API |
| DB | SQLite + Drizzle | Durable local state without a hosted DB |
| LLM | Gemini | Structured JSON for brief/draft/rewrites |
| Ingest | `fetch` + Readability | Good enough + paste fallback |
| UI | Tailwind + Atelier tokens | Newsreader / Literata / Space Mono — editorial, not dashboard chrome |
| Deploy | Docker → Render disk | Keep SQLite; avoid serverless filesystem traps |

**AI does:** research brief, starter/section generation, explain + rewrite.  
**Code does:** SSRF-safe fetch, extraction, detectors, overlap, metrics, accept/reject offsets, Zod validation of model JSON.

---

## Assignment checklist

| Deliverable | Where |
|---|---|
| Working app | Live link above, or local / Docker setup |
| Source + README | This repo |
| Product & engineering note | [`docs/PRODUCT_ENGINEERING_NOTE.md`](./docs/PRODUCT_ENGINEERING_NOTE.md) |
| Sample editorial | [`docs/sample-editorial.md`](./docs/sample-editorial.md) |
| Before/after writing | [`docs/before-after-writing.md`](./docs/before-after-writing.md) |

---

## Deeper docs

| Doc | What it’s for |
|---|---|
| [`docs/MVP_SCOPE.md`](./docs/MVP_SCOPE.md) | What’s in / out |
| [`docs/DECISIONS.md`](./docs/DECISIONS.md) | ADRs |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | System shape |
| [`docs/SCHEMA.md`](./docs/SCHEMA.md) | Data model |
| [`docs/TESTING.md`](./docs/TESTING.md) | Edge cases we care about |
| [`docs/PROGRESS.md`](./docs/PROGRESS.md) | Verification log |
| [`docs/RISKS.md`](./docs/RISKS.md) | Known limits |
