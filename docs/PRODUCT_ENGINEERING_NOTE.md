# Product & engineering note

Concise answers for assignment Part D. Decisions are grounded in ADR-001…014 and the shipped M0–M7 codebase.

## Product thinking

**Who is the primary user?**  
A This Week in AI newsletter editor (or an FDE evaluating that workflow) who needs to turn raw AI sources into an evidence-backed brief and a polished ~300–500 word editorial without surrendering editorial control.

**Most important problem**  
Story discovery with attribution, then controlled drafting and sentence-level polish—not a publishing CMS or multi-tenant SaaS.

**Core workflow**  
Sources (≥3 usable) → research brief (facts vs analysis, angles) → angle → starter draft or outline → optional draft section regenerate → Writing Assistant analyze / accept / reject → compare original vs revised (ADR-001, ADR-004, ADR-005, ADR-008).

**Prioritized vs deliberately left out**  
Shipped: SSRF-safe ingest, Zod-validated Gemini JSON, draft section regen, hybrid writing detectors. Cut for MVP (ADR-009): auth, multi-tenant cloud DB, brief per-section regen, jargon checker, LangChain/multi-agent orchestration, Inter/dark-glow UI.

**Usefulness metrics**  
Editor can surface a non-obvious angle from ≥3 sources; claims link to sources; suggestions are rejectable and never silently overwrite; sample editorial is specific to founders/builders/operators ([docs/MVP_SCOPE.md](./MVP_SCOPE.md)).

## Engineering

**Structure**  
Next.js App Router + TypeScript; SQLite via Drizzle (`DATABASE_PATH`); services in `lib/*` (ingestion, research, draft, writing); APIs under `app/api/*`; workspace UI in `components/workspace/*`.

**AI vs deterministic**  
- **AI (Gemini):** research brief, draft/outline/section generation, writing explain+rewrite.  
- **Deterministic:** SSRF/fetch limits, Readability extract, sourceId sanitization, complex/passive/filler detectors, overlap priority, metrics (incl. Flesch), accept offset apply.

**Failure handling**  
Inaccessible URLs → `needs_content` / paste recovery; never invent body text. LLM setup/rate-limit/invalid JSON → typed API errors with limited repair retry. Empty draft analyze blocked. Missing `GEMINI_API_KEY` / `GEMINI_MODEL` fails clearly on first AI call.

**Source links supporting claims**  
Brief claims store `sourceIds`; validated against ready sources on generate. Draft `sources` section is a deterministic citation list from project sources.

**Another day of work**  
1. Live Gemini smoke in CI with a Flash-class `generateContent` model.  
2. Screenshot pack for README stages.  
3. Docker + SQLite on a persistent volume (Compose verified; Render blueprint ready) (M8 / ADR-015).

## Editorial judgment

**Clear and useful writing**  
Preserves factual accuracy, technical nuance, and author intent. Short sentences are a signal, not a religion.

**Evaluating the Writing Assistant**  
Useful if editors accept high-signal rewrites and easily reject false positives or meaning-changing edits—measured by accept/reject behavior and original-vs-revised compare, not by chasing readability score (FR-061).

**Changes the tool must not make automatically**  
Silent bulk rewrites, score-optimization that strips nuance, or applying overlapping suggestions that corrupt offsets. Accept/reject stays human-gated; original snapshot is preserved.
