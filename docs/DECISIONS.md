# Architecture Decision Records

Status values: `Proposed` | `Approved` | `Superseded` | `Rejected`

---

## ADR-001: Unified editorial project workflow

- **Decision ID:** ADR-001
- **Date:** 2026-11-02
- **Status:** Approved
- **Phase:** Product discovery

### Context

The PRD requires both a Research Assistant and a Writing Assistant, and explicitly leaves open how they should work together. The assignment evaluates product judgment as much as implementation.

### Problem

Should the MVP be one continuous editorial flow, two loosely connected tools, or a research brief that only seeds a separate writing paste-in experience?

### Alternatives considered

1. **Unified editorial project** — Sources → research brief → draft from angle → writing analysis in one flow.
2. **Two tools with soft handoff** — Separate Research and Writing surfaces; user copies content between them.
3. **Research-only seed** — Research produces brief + starter draft text; Writing remains an independent paste-in tool.

### Decision

**Option 1: Unified editorial project (ruthlessly scoped).**

Core flow: add ≥3 sources → evidence-backed brief (facts vs analysis, angles) → select an angle → draft → writing analysis with accept/reject → compare original vs revised.

Explicitly out of scope for this decision: auth, multi-user collaboration, publishing/CMS, multi-project dashboards.

### Rationale

- Matches the PRD’s mission: raw information → polished draft.
- Makes the sample editorial output a natural product outcome, not a bolted-on artifact.
- Stronger demonstration of product thinking than two disconnected demos.
- Complexity is manageable if persistence, auth, and publishing stay out.

### Trade-offs

- More UX and state design than two independent tools.
- Requires clear handoff between research artifacts and the draft editor.
- Temptation to overbuild project management — must be resisted.

### Consequences

- Information architecture centers on a single editorial session/project.
- Schema, API, and UI will share one workspace model.
- Next decisions: what persists across reloads, and how sources are ingested when URLs fail.

### Approval

Approved by product owner (user) on 2026-11-02 — choice **A**.

---

## ADR-002: Local durable persistence (MVP); hosted projects deferred

- **Decision ID:** ADR-002
- **Date:** 2026-11-02
- **Status:** Approved
- **Phase:** Product discovery

### Context

The unified editorial workflow (ADR-001) is multi-step and LLM-latency-sensitive. Refresh/loss mid-flow is a high-risk demo failure. The PRD does not require multi-user accounts or cloud sync.

### Problem

What must survive a browser refresh or process restart for the MVP, and should we design now for a later hosted multi-project database?

### Alternatives considered

1. **Session-only** — In-memory / tab lifetime only.
2. **Local durable** — SQLite or equivalent on the machine running the app; single active project or a small recent-projects list; no auth.
3. **Hosted DB + projects** — Cloud database, named projects, path toward accounts/sync.

### Decision

**Option 2 for MVP: local durable persistence.**

- Persist editorial project state: sources, extracted content, research brief, draft (original + working), suggestions accept/reject state, and key metadata.
- No authentication.
- No multi-device sync.
- Hosted DB / richer project management (**Option 3**) is an **explicit stretch goal only if time remains after the core workflow is verified** — not a near-term architecture requirement.

### Rationale

- Protects the research → draft → polish journey without cloud DB cost or auth complexity.
- Matches assignment constraints (not production-ready; prioritize valuable workflow).
- Keeps schema honest for one local workspace instead of premature multi-tenant design.

### Trade-offs

- Not portable across machines without file/DB copy.
- Stretch Option 3 must not leak into MVP abstractions (no fake “tenant_id”, no premature ORM layering for cloud).

### Consequences

- Prefer a simple local store (likely SQLite or equivalent once stack is chosen).
- Schema should model one editorial project cleanly; “list of recent projects” is optional sugar, not a portfolio product.
- If Option 3 is pursued later, it should be a deliberate migration ADR — not silent scope creep during MVP.

### Engineering challenge (recorded)

Designing the MVP “as if Option 3 is inevitable” is overengineering. We will implement Option 2 cleanly and only revisit Option 3 after the end-to-end workflow works.

### Approval

Approved by product owner (user) on 2026-11-02 — **2 first; 3 only if time permits**.

---

## ADR-003: Mixed source inputs; optional X API for tweet URLs

- **Decision ID:** ADR-003
- **Date:** 2026-11-02
- **Status:** Approved
- **Phase:** Product discovery

### Context

The PRD accepts articles, tweets, or URLs. Scraping X/Twitter HTML is unreliable. The official X API is pay-per-use (~$0.005 per post read), requires a developer app/bearer token, and adds setup friction for anyone cloning the repo. Paste is how editors actually recover when fetch fails.

### Problem

How should users add sources in the MVP, and should tweet URLs hard-depend on the X API?

### Alternatives considered

1. **URLs only** — fetch or fail.
2. **URL-first + paste fallback** — fetch articles; paste only after failure.
3. **Mixed from the start (C)** — each source may be a URL, pasted content, or both.
4. **Hard X API for tweets** — tweet URLs require official API; no paste-only tweet path.
5. **C′ (mixed + optional X)** — mixed inputs always; if X credentials exist, enrich tweet URLs via API; otherwise paste with URL kept as citation.

### Decision

**C′: Mixed source inputs from day one, with optional X API enrichment.**

- Every source supports: optional URL, optional pasted title/body, and a source kind (`article` | `tweet` | `other`).
- Generic/article URLs: attempt fetch + content extraction; on failure, mark `needs_content` and allow paste.
- Tweet/X URLs: if configured bearer token is present, attempt official post lookup by ID; otherwise require paste (URL retained for attribution).
- Brief generation requires **≥3 sources with usable content**, not merely ≥3 URL strings.
- Third-party tweet scrapers are out of scope for MVP.

### Rationale

- Satisfies PRD input flexibility without brittle social scraping.
- Preserves a real ingestion path for articles (engineering signal).
- Keeps demos reproducible without forcing every reviewer to set up X billing.
- Allows X API if credentials are available without making it a hard dependency.

### Trade-offs

- UI must make “URL vs paste vs both” obvious without feeling cluttered.
- Optional X path means behavior differs by environment — must be documented clearly in README.
- Users can over-rely on paste and under-exercise URL extraction — sample editorial should still demonstrate real URL ingestion.

### Consequences

- Ingestion pipeline is modality-aware (fetch | x_api | paste | hybrid).
- Env var for X is optional (e.g. `X_BEARER_TOKEN`); absence is not an application error.
- Product/engineering note must disclose X API as optional enrichment.

### Approval

Approved by product owner (user) on 2026-11-02 — **“C sounds good”**, interpreted as **C′** (mixed inputs; X API optional). Correct if hard X or paste-only-tweets was intended.

---

## ADR-004: Research → draft handoff (hybrid default + outline-only option)

- **Decision ID:** ADR-004
- **Date:** 2026-11-02
- **Status:** Approved
- **Phase:** Product discovery

### Context

ADR-001 requires a unified flow from research to polished draft. Part C requires a 300–500 word sample editorial produced via the app. Writers still need control; blind auto-draft can feel generic.

### Problem

After the research brief and newsletter angles exist, how does the user create the draft that enters the Writing Assistant?

### Alternatives considered

1. **Angle → auto-draft only** — LLM writes a full starter piece.
2. **Outline-only / user writes** — angle yields outline + claims/evidence; user drafts manually (optional light assist).
3. **Hybrid only** — always generate a structured starter draft into the editor.
4. **Hybrid default + optional shift to outline-only** — default generates starter draft; user may choose outline-only instead.

### Decision

**Option 4: Hybrid by default, with an explicit outline-only mode.**

- **Default:** user selects (or confirms) a newsletter angle → system generates a labeled AI starter draft (~300–500 words: headline + sections aligned to Part C) into the Writing Assistant, grounded in the brief and source evidence.
- **Alternate mode:** “Outline only” — generate structured outline + key claims with source links; user writes the draft in the editor (paste or type); Writing Assistant still applies.
- User may regenerate from the same or edited angle text.
- Starter drafts must be clearly labeled as AI-assisted starting points, not final editorial voice.
- MVP does **not** include a full section-by-section regeneration CMS, collaborative editing, or multiple simultaneous draft branches.

### Rationale

- Default path efficiently satisfies Part C and demonstrates research→write integration.
- Outline-only respects editors who want control or dislike AI prose as a starting point.
- One workspace with a mode choice beats building two separate workflows.

### Trade-offs

- Slightly more UI (mode toggle / choice before generate).
- Two generation prompts/paths to design and test.
- Risk of scope creep into “writing studio” features — resist beyond toggle + regenerate.

### Consequences

- Draft generation API/prompt variants: `starter_draft` | `outline_only`.
- Writing Assistant must work equally well on AI-starter and human-written drafts.
- Sample deliverable will use the default starter-draft path, then Writing Assistant before/after.

### Approval

Approved by product owner (user) on 2026-11-02 — **3 with option to shift to 2**.

---

## ADR-005: Writing Assistant analysis strategy (hybrid checks)

- **Decision ID:** ADR-005
- **Date:** 2026-11-02
- **Status:** Approved
- **Phase:** Product discovery

### Context

Part B requires ≥3 writing-quality checks, actionable feedback with passage + explanation + rewrite, accept/reject control, original preserved, comparison, and metrics — without blindly optimizing readability scores or destroying technical nuance.

### Problem

Which checks ship in MVP, and which parts should be deterministic vs LLM-powered?

### Alternatives considered

1. All LLM issue detection.
2. All deterministic detection and rewrites.
3. Hybrid: deterministic detection for core checks; LLM for contextual explanation/rewrites; deterministic metrics.

### Decision

**Hybrid analysis with three MVP checks:**

1. **Long / complex sentences** — deterministic detection; LLM explain + rewrite for flagged spans.
2. **Passive voice** — deterministic detection; LLM rewrite optional/when useful.
3. **Filler / hedge / unnecessary words** — deterministic lexicon + light patterns; LLM rewrite when needed.

**Metrics (deterministic always):** word count, average sentence length, reading time, readability score — each with a short plain-language explanation. Scores are informational, not optimization targets.

**LLM responsibilities in writing:** contextual *why*, meaning-preserving rewrite suggestions, respect for technical terms and author intent.

**Deferred:** hard “unexplained jargon” checker, deep paragraph discourse analysis, style transfer, multi-branch suggestion history beyond accept/reject + original vs revised.

**Overlap handling (MVP rule):** suggestions use non-overlapping spans. If multiple rules hit the same sentence, keep a single suggestion using priority **complexity > passive > filler** (or an equivalent merge into one suggestion). Accept/reject must not corrupt text via overlapping applies.

### Rationale

- Testable, cheap detection for the checks that rules handle well.
- LLM value where judgment matters (explanation + rewrite).
- Matches editorial principle: assist decisions, don’t worship scores.
- Three solid checks beat six shallow ones.

### Trade-offs

- Deterministic detectors will miss some nuance and false-positive sometimes — UX must allow easy reject.
- Two-stage pipeline (detect → suggest) adds orchestration complexity vs one LLM call.
- Priority-based overlap rule is imperfect but predictable.

### Consequences

- Writing pipeline: parse draft → run detectors → select non-overlapping issues → LLM suggestions for flagged spans → present accept/reject → recompute metrics.
- Unit tests should cover detectors heavily; LLM suggestion path needs schema validation + golden-path integration tests.

### Approval

Approved by product owner (user) on 2026-11-02 — **yes**.

---

## ADR-006: Local-first delivery, then free-tier deploy

- **Decision ID:** ADR-006
- **Date:** 2026-11-02
- **Status:** Approved
- **Phase:** Product discovery

### Context

PRD accepts a deployed URL *or* reproducible local setup. ADR-002 chose local durable persistence (likely SQLite). Free-tier hosting must not dictate premature cloud architecture.

### Problem

What is the submission deployment bar?

### Alternatives considered

1. Local-only forever.
2. Live URL required from day one.
3. **Local-first implementation and verification, then migrate/deploy to a free tier** once the core workflow works.

### Decision

**Local-first, then free-tier deploy.**

1. Build, test, and document a reliable local run path (primary development target).
2. After the end-to-end editorial workflow is verified locally, deploy to a suitable free tier if feasible without rewriting the product.
3. Architecture should not assume a specific host yet; choose hosting in Phase 2 with SQLite/local-durable constraints in mind (or a documented free-tier adaptation).
4. README must always document local startup; live URL is added when deployment succeeds.

### Rationale

- Protects focus on product quality over infra.
- Still aims for the nicer reviewer experience (live link) when cheap.
- Avoids letting platform limits shape the MVP incorrectly.

### Trade-offs

- Free-tier + SQLite can be awkward (ephemeral filesystems). May need a documented adaptation (e.g. file-backed store on a persistent free tier, or accept ephemeral demo data on host).
- Two environments to verify (local + deployed).

### Consequences

- Phase 2 stack selection must include a credible free-tier path.
- Deployment is a late milestone, not a foundation blocker.
- Do not block core feature work on hosting.

### Approval

Approved by product owner (user) on 2026-11-02 — **build locally first, then shift to free tier**.

---

## ADR-007: Research brief editability + scoped per-section regenerate

- **Decision ID:** ADR-007
- **Date:** 2026-11-02
- **Status:** Superseded (by ADR-008 on per-section regenerate target)
- **Phase:** Product discovery

### Context

User requested per-section regenerate in addition to view/edit and full regenerate. Unbounded section tooling can become a mini-CMS and burn assignment time.

### Problem

How editable is the research brief, and what does “per-section regenerate” mean in MVP?

### Alternatives considered

1. Brief read-only except angle text; full regenerate only.
2. Fully editable unstructured markdown brief; no structured regen.
3. **Structured brief with full regenerate + per-section regenerate for a fixed section set.**
4. Per-section regenerate for both research brief *and* draft body sections (large scope).

### Decision

**Structured research brief is viewable and lightly editable, with full regenerate and scoped per-section regenerate.**

Fixed research brief sections (MVP set — finalized in design docs, expected to include):

- What happened
- Why it matters (founders / builders / operators)
- Facts vs analysis/speculation
- Evidence / source-linked claims
- Connections / story possibilities
- Newsletter angles (at least one; typically several)

Behaviors:

- **Edit:** user may edit section text before drafting (edits persist).
- **Regenerate all:** re-run research generation on current sources.
- **Regenerate section:** re-run LLM for one section, using sources + the rest of the brief as context; replace that section only.
- **Draft side:** regenerate whole starter draft / outline (ADR-004). **No** per-paragraph draft regenerate matrix in MVP.
- Writing Assistant suggestions remain the mechanism for improving draft prose (ADR-005).

### Rationale

- Per-section regen is high leverage on the research artifact (where structure matters).
- Draft per-section regen duplicates Writing Assistant value and inflates scope.
- Fixed section list keeps UX and prompts testable.

### Trade-offs

- More prompt/API surface than full-regen-only.
- Section regen can drift from other sections (consistency risk) — mitigate by passing sibling section summaries as context and showing a “regenerated” affordance.
- User asked broadly for per-section regenerate; draft-side is intentionally excluded unless revisited.

### Consequences

- Brief stored as structured sections, not one opaque blob.
- API: `regenerateBrief` + `regenerateBriefSection(sectionId)`.
- If implementation time gets tight, section regen is the first research UX luxury to simplify — but it is currently in approved scope.

### Approval

Approved by product owner (user) on 2026-11-02 — **add per-section regenerate**, originally scoped to research brief sections.

### Supersession

Per-section regenerate target corrected by user to **draft sections** — see **ADR-008**. Brief editability + full brief regenerate from this ADR remain in effect unless further superseded.

---

## ADR-008: Per-section regenerate targets the draft (not the brief)

- **Decision ID:** ADR-008
- **Date:** 2026-11-02
- **Status:** Approved
- **Phase:** Product discovery
- **Supersedes:** ADR-007 decision on *where* per-section regenerate applies

### Context

After clarifying “research brief” vs “draft sections,” the product owner chose option **2: draft only**.

### Problem

Should per-section regenerate refresh structured research-brief sections, newsletter draft sections, or both?

### Alternatives considered

1. Brief only.
2. **Draft only.**
3. Both.

### Decision

**Per-section regenerate applies to the newsletter draft, not the research brief.**

**Draft side (in scope):**

- Starter draft / written article is structured into stable editorial sections aligned with Part C, e.g.:
  - Headline
  - What happened
  - Context / background
  - Analysis / why it matters
  - Practical implication / opportunity
  - Source links (usually not LLM-regenerated as prose; managed as citations)
- User can regenerate **one draft section** at a time from the brief + selected angle + other sections as context.
- Full draft regenerate / outline-only modes from ADR-004 remain available.
- Writing Assistant (ADR-005) still runs on the full working draft for issue detection, rewrites, accept/reject, and original vs revised comparison.

**Research brief side (MVP):**

- View + light edit + **full** brief regenerate remain (from ADR-007, kept).
- **No** per-section brief regenerate in MVP (reduces duplicate regen UX).

### Rationale

- Matches explicit product-owner choice after clarification.
- Draft is the artifact readers see; section regen helps shape the sample editorial.
- Keeps brief tooling simpler; Writing Assistant still improves prose at sentence level.

### Trade-offs / challenge

- Draft section regen + Writing Assistant can overlap: regen replaces a whole section; Writing Assistant patches spans. That is acceptable if UX labels them differently (“Regenerate section” vs “Suggestion”).
- Risk: too many draft controls. Mitigate with a fixed section schema (not arbitrary user-defined sections).
- Consistency drift across sections after one section regen — pass sibling sections + brief into the prompt.

### Consequences

- Draft stored as structured sections (or equivalently section-anchored content), not only a single undifferentiated string — *or* a single string plus section markers; design will pick the simpler durable representation in Phase 3.
- API: `regenerateDraftSection(sectionId)` in addition to full draft/outline generation.
- Brief API: full regenerate only (no `regenerateBriefSection` in MVP).
- Sample workflow can demonstrate regenerating one weak section before running Writing Assistant.

### Approval

Approved by product owner (user) on 2026-11-02 — choice **2** (draft sections).

---

## ADR-009: MVP scope freeze

- **Decision ID:** ADR-009
- **Date:** 2026-11-02
- **Status:** Approved
- **Phase:** Product discovery

### Context

Critical product ambiguities for workflow, persistence, sources, draft handoff, writing analysis, deployment posture, and regenerate targets were resolved (ADR-001–008).

### Decision

Approve the MVP scope documented in `docs/MVP_SCOPE.md`: unified local editorial project; mixed sources; research brief; starter draft / outline-only; draft section regenerate; hybrid Writing Assistant; local-first then free-tier deploy; explicit exclusions listed in that file.

### Rationale

Scope is the smallest complete product that satisfies the PRD with strong product narrative and bounded engineering risk.

### Consequences

- Phase 1 requirements extraction proceeds against this scope  
- Phase 2 stack selection must serve this scope only  
- Scope expansions require a new ADR  

### Approval

Approved by product owner (user) on 2026-11-02 — **`approve MVP scope`**.

---

## ADR-010: Technology stack + ui-ux-pro-max frontend design system

- **Decision ID:** ADR-010
- **Date:** 2026-11-02
- **Status:** Approved
- **Phase:** Technology selection

### Context

MVP scope is frozen (ADR-009). User approved the recommended engineering stack and required the frontend to be designed with the **ui-ux-pro-max** skill so the product looks polished.

### Decision

**Engineering stack**

| Layer | Choice |
|---|---|
| App | Next.js App Router (TypeScript) monolith |
| API | Next.js Route Handlers |
| DB | SQLite file (local durable) |
| LLM | Gemini Flash-class only (MVP); Groq deferred |
| Ingestion | Fetch + Readability-style extraction; paste fallback; optional X API |
| Styling | Tailwind CSS + design tokens from design system |
| Icons | Lucide (or Heroicons) SVG |
| Deploy | Local-first → Render/Railway/Fly (not Vercel+file SQLite) |

**Frontend design process**

- Use **ui-ux-pro-max** to generate and maintain the design system under `design-system/this-week-in-ai-editorial/`.
- **Authoritative UI spec:** `MASTER.md` + `pages/workspace.md` (includes product overrides).
- Raw skill defaults that conflict with editorial-tool UX or project design rules are **overridden** (notably: reject dark-cinematic/glass/glow/Inter as primary).

**Approved visual direction**

- Light, content-first editorial minimalism  
- Libre Bodoni + Public Sans (+ JetBrains Mono sparingly)  
- Navy/teal professional palette on cool paper neutrals  
- Hemingway-inspired highlight colors for writing checks  
- Subtle motion only  

### Rationale

- Stack matches MVP simplicity and local SQLite.  
- ui-ux-pro-max provides structured UX/visual guidance; curated overrides keep the UI appropriate for editors instead of generic “AI dark dashboard.”

### Trade-offs

- Design-system maintenance is an extra doc surface.  
- Overriding skill defaults requires discipline so implementation doesn’t silently revert to Inter/dark/glow.

### Consequences

- Implementation must read the design-system folder before building UI.  
- `docs/DESIGN.md` and agent rules will point at this system.  
- Groq and hosted multi-project DB remain deferred.

### Approval

Approved by product owner (user) on 2026-11-02 — recommended stack + ui-ux-pro-max frontend.

---

## ADR-011: Affirm SQLite over Mongo; affirm tweet paste + optional X API

- **Decision ID:** ADR-011
- **Date:** 2026-11-02
- **Status:** Approved
- **Phase:** Planning review (post Phase 3 challenge)

### Context

After Phase 3 docs, the product owner asked: (1) why not Mongo/NoSQL given JSON-heavy LLM payloads; (2) whether tweets can be fetched without paying for X if no API token exists.

### Problem

Revisit persistence and tweet-ingestion choices before implementation authorization.

### Alternatives considered

**Database**

1. SQLite (current) — relational project graph + JSON columns/blobs for model payloads.
2. MongoDB / document DB — natural nested documents; requires daemon or Atlas; weaker local-first story.
3. Postgres JSONB — overkill for single-user local MVP.

**Tweets without X token**

1. Paste + keep URL as citation (current).
2. Scrape x.com HTML — brittle, blocked often, ToS risk.
3. Third-party scraper APIs / Nitter mirrors — unreliable or gray-area; free tiers not a durable assignment dependency.
4. Hard-require paid X API — hurts clone/run and demos.

### Decision

**Keep recommendations:**

1. **SQLite** remains the MVP database (ADR-002 / ADR-010). Nested brief/draft JSON is stored as validated structures / JSON text; relational FKs for sources↔claims stay first-class. Mongo is explicitly rejected for MVP.
2. **Tweets:** optional official X API when `X_BEARER_TOKEN` is set; otherwise **user paste** with URL retained for attribution (ADR-003). No HTML scraping and no third-party tweet scraper as a core path.

### Rationale

- JSON-shaped LLM output ≠ need for a document database; SQLite JSON + columns fit the actual access patterns.
- Local-first + simple deploy path outweigh Mongo ergonomics for nested fields.
- No reliable free official tweet-by-URL API; paste is honest and demo-safe.

### Trade-offs

- Manual paste friction for tweets without X credentials — accepted and documented in README.
- Developers used to Mongo must map nested updates explicitly — acceptable at this scale.

### Consequences

- No schema migration to Mongo planned.
- Product/engineering note and README must state tweet paste fallback and rejection of scraping.
- RISKS remain: R-02 (extraction), R-09 (X optional).

### Approval

Approved by product owner (user) on 2026-11-02 — **“keep the recommended ones.”**

---

## ADR-012: Implementation plan approved; README submission shape

- **Decision ID:** ADR-012
- **Date:** 2026-11-02
- **Status:** Approved (plan) — implementation coding still gated
- **Phase:** Approval gate

### Context

Phase 3 planning package was complete. User requested plan approval and a README aligned to PRD §10 (live link, GitHub link, decisions walkthrough), including screenshots, new-machine setup, and self-hosting.

### Decision

1. **Approve the end-to-end implementation plan** (docs + milestones M0–M8, stack ADR-010, scope ADR-009, ADR-011 affirmations).  
2. **Root README** is the submission walkthrough: decisions + why, screenshot slots, setup on a new system, self-hosting, deliverables map to PRD §7/§10.  
3. **Application source code** still requires the explicit phrase  
   `APPROVE PLAN AND AUTHORIZE IMPLEMENTATION`  
   before M0 scaffolding begins (per operating rules). “Approve plan” authorizes the plan and README work, not silent coding.

### Consequences

- README may contain intended setup/self-host commands marked as unverified until M0/M8.  
- Screenshot paths live under `docs/screenshots/` as placeholders until UI exists.

---

## ADR-013: Authorize pushing documentation to the remote repository

- **Decision ID:** ADR-013
- **Date:** 2026-11-02
- **Status:** Approved
- **Phase:** Implementation handoff

### Context

A user rule defaults to **code-only pushes** (no README/docs/markdown/images unless explicitly authorized). The product owner stated they do not mind pushing docs to the repo for this assignment.

### Decision

For **this repository** (`ThisWeekAI_Assignment` / `D:\FDEassignment`):

- Planning docs, README, ADRs, design-system markdown, screenshots used for the submission, and `docs/PROGRESS.md` **may be committed and pushed** along with code.
- Still **never** commit or push secrets (`.env`, API keys), `node_modules`, `.next`, or SQLite DB binaries.
- This does **not** grant force-push, history rewrite, or pushing unrelated binary media dumps.

### Rationale

Assignment evaluators need the README and engineering docs on GitHub (PRD §7 / §10).

### Approval

Approved by product owner (user) on 2026-11-02 — **“I dont mind pushing the docs to the repo.”**

---

## ADR-014: Drizzle + better-sqlite3; project API from TECHNICAL_REQUIREMENTS

- **Decision ID:** ADR-014
- **Date:** 2026-11-02
- **Status:** Approved (implemented in M1)
- **Phase:** M1 — Database + project persistence

### Context

PLANNING_AUDIT deferred ORM choice (Drizzle vs raw better-sqlite3) to M1. IMPLEMENTATION_PLAN M1 shorthand mentioned `GET/POST /api/projects`, while TECHNICAL_REQUIREMENTS §7 specifies `GET` / `PATCH` `/api/projects/current`.

### Decision

1. **Persistence stack:** `better-sqlite3` + thin **Drizzle ORM** + committed `drizzle-kit` SQL migrations under `drizzle/`.
2. **Migrate on open:** `getDb()` applies pending migrations so local setup does not require a separate migrate step for MVP.
3. **API:** Follow TECHNICAL_REQUIREMENTS — `GET` / `PATCH` `/api/projects/current` (bootstrap default project; update title/stage).
4. **IDs:** `crypto.randomUUID()`.
5. **Active project:** Most recently `updated_at`, else insert default (`Untitled editorial`, stage `sources`).
6. **Schema:** Full SCHEMA.md table graph created in M1; only the projects repository and API are wired (sources/brief/draft/writing repos later).

### Rationale

- Typed schema stays close to SCHEMA.md without a heavy repository framework.
- TECH_REQ is the API contract authority for route shapes.
- Migrate-on-open keeps README local setup short.

### Consequences

- Route handlers must stay on the Node.js runtime (native `better-sqlite3`); not Edge.
- `next.config` lists `better-sqlite3` in `serverExternalPackages`.
- SQLite DB files remain gitignored; never commit `*.db`.
