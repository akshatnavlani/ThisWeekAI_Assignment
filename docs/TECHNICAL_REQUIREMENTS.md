# Technical Requirements

**Status:** Phase 3 — stack-aligned  
**Authority:** PRD + `docs/MVP_SCOPE.md` + ADR-001…010  
**Last updated:** 2026-11-02

## 1. Functional requirements

### Sources & ingestion

| ID | Requirement |
|---|---|
| FR-001 | User can add sources as URL, pasted content, or both. |
| FR-002 | System accepts article-like URLs and attempts content extraction. |
| FR-003 | Tweet/X URLs may be enriched via official X API when credentials exist; otherwise paste is required and URL is kept for citation. |
| FR-004 | Failed URL extraction marks source `needs_content` and allows paste recovery without discarding the source. |
| FR-005 | User can provide at least three sources; brief generation requires ≥3 sources with usable content. |
| FR-006 | Each source stores original URL (if any), title, extracted/pasted text, modality, and status. |
| FR-007 | Duplicate URLs in the same project are detected and surfaced (block or warn — default: warn + prevent duplicate add). |

### Research Assistant

| ID | Requirement |
|---|---|
| FR-010 | Generate a structured research brief from usable sources. |
| FR-011 | Brief includes concise “what happened.” |
| FR-012 | Brief explains why it matters to founders, builders, and/or business operators. |
| FR-013 | Brief distinguishes verifiable facts from analysis/speculation. |
| FR-014 | Claims/evidence items link to supporting source references. |
| FR-015 | Brief suggests ≥1 newsletter angle (prefer multiple). |
| FR-016 | Brief includes links to original sources. |
| FR-017 | User can view and lightly edit brief content before drafting. |
| FR-018 | User can fully regenerate the research brief from current sources. |
| FR-019 | System surfaces interesting connections / story possibilities across sources (structured field or section). |

### Drafting

| ID | Requirement |
|---|---|
| FR-030 | User selects/confirms a newsletter angle before generation. |
| FR-031 | Default mode generates a labeled AI starter draft (~300–500 words) into the writing workspace. |
| FR-032 | Alternate mode generates outline only; user writes or pastes draft prose. |
| FR-033 | Starter draft includes headline, what happened, context, analysis, practical implication/opportunity, and source links. |
| FR-034 | User can regenerate the full starter draft or outline. |
| FR-035 | User can regenerate an individual draft section from a fixed section set (headline, what happened, context, analysis, implication; sources managed as citations). |
| FR-036 | Draft generation is grounded in the brief + sources; unsupported invention should be minimized and not presented as fact. |

### Writing Assistant

| ID | Requirement |
|---|---|
| FR-050 | User can analyze the current working draft. |
| FR-051 | System detects long/complex sentences (deterministic). |
| FR-052 | System detects passive voice (deterministic). |
| FR-053 | System detects filler/hedge/unnecessary words (deterministic). |
| FR-054 | For each issue: show passage, explain why, suggest rewrite where appropriate (LLM-assisted). |
| FR-055 | Inline highlight of problematic passages. |
| FR-056 | User can accept or reject each suggestion individually. |
| FR-057 | Original draft is preserved until changes are accepted. |
| FR-058 | User can compare original vs revised text. |
| FR-059 | Display word count, average sentence length, reading time, and a readability score with plain-language explanations. |
| FR-060 | Suggestions use non-overlapping spans; overlapping rule hits resolve by priority complexity > passive > filler. |
| FR-061 | Assistant must not blindly optimize readability score at the expense of meaning/nuance. |

### Persistence & workspace

| ID | Requirement |
|---|---|
| FR-070 | Editorial project state persists locally across refresh/restart (sources, brief, drafts, suggestion state as needed). |
| FR-071 | No authentication in MVP. |
| FR-072 | User can continue the unified flow in one project: sources → brief → draft → writing assist. |

### Sample / deliverable support

| ID | Requirement |
|---|---|
| FR-080 | Application supports producing the sample editorial (Part C) via the real workflow. |
| FR-081 | Application supports capturing before/after writing examples (original, suggestions/feedback, revised). |

## 2. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-001 | Preserve source attribution throughout research and drafting. |
| NFR-002 | Handle inaccessible URLs gracefully (no crash; actionable recovery). |
| NFR-003 | Validate LLM structured outputs; retry or fail clearly on malformed responses. |
| NFR-004 | Never commit API keys; use env vars + `.env.example`. |
| NFR-005 | Mitigate SSRF risks on URL fetch (block private/metadata ranges; timeouts; size limits). |
| NFR-006 | Local startup must be reproducible from README. |
| NFR-007 | Core happy path should complete with free-tier LLM usage where possible; document limits. |
| NFR-008 | Prefer simplicity suitable for a take-home — avoid unjustified infrastructure. |
| NFR-009 | Important failures (fetch, LLM, validation) show clear user-facing errors. |
| NFR-010 | Deterministic writing detectors should be unit-testable without network. |

## 3. User journeys

### J1 — Research to brief

Add ≥3 sources → resolve any `needs_content` → generate brief → review facts/analysis/angles → optional edit/full regen.

### J2 — Brief to draft

Select angle → choose starter draft or outline → review structured draft → optional section regen.

### J3 — Polish draft

Analyze → review highlights/suggestions/metrics → accept/reject → compare original vs revised.

### J4 — Submission artifact path

Use J1–J3 on real sources → export/save final piece + before/after for docs.

## 4. Error scenarios (minimum)

| ID | Scenario | Expected handling |
|---|---|---|
| ERR-001 | URL timeout / 403 / paywall | Mark failed; allow paste; do not invent body text |
| ERR-002 | <3 usable sources at generate | Block with clear message |
| ERR-003 | LLM rate limit | User-visible retry/backoff guidance |
| ERR-004 | Malformed LLM JSON | Validate, limited retry, then fail visibly |
| ERR-005 | Empty draft analyze | Block with message |
| ERR-006 | Missing LLM API key | Fail at startup or first AI call with setup hint |
| ERR-007 | X API missing/fail on tweet URL | Fall back to paste path |

## 5. Explicit constraints

- Not production-ready (PRD)  
- Simple functional UI sufficient  
- Mock only nonessential integrations; core workflow must be real  
- Document assumptions

## 6. Acceptance criteria (product-level)

- [ ] ≥3 sources processed with usable content  
- [ ] Brief answers what/why/who-cares with facts vs analysis and source links  
- [ ] ≥1 newsletter angle suggested  
- [ ] Starter draft or outline path works  
- [ ] Draft section regenerate works for at least one section  
- [ ] ≥3 writing checks with highlight + explain + rewrite + accept/reject  
- [ ] Original vs revised comparison works  
- [ ] Metrics shown with explanations  
- [ ] Sample 300–500 word editorial produced via app  
- [ ] Before/after writing example available  
- [ ] README runs locally; secrets not committed  

## 7. API requirements

Base: `/api` · JSON · no auth (MVP)

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/projects/current` | Load or bootstrap default project (sources, brief, draft, suggestions summary) |
| PATCH | `/api/projects/current` | Update title/stage |
| POST | `/api/sources` | Add source `{ url?, title?, content?, kind? }` → ingest |
| PATCH | `/api/sources/:id` | Update paste/title; re-ingest if URL changed |
| DELETE | `/api/sources/:id` | Remove source (warn if cited) |
| POST | `/api/sources/:id/reingest` | Retry fetch/X |
| POST | `/api/research/generate` | Full brief generate/regen; requires ≥3 ready sources |
| PATCH | `/api/research/brief` | Light edit structured fields |
| POST | `/api/draft/generate` | `{ mode: starter_draft\|outline_only, angleId, angleOverride? }` |
| POST | `/api/draft/sections/:sectionKey/regenerate` | Regen one section |
| PATCH | `/api/draft/sections/:sectionKey` | Manual edit section content |
| POST | `/api/writing/analyze` | Run detectors + LLM suggestions; replace pending |
| POST | `/api/writing/suggestions/:id/accept` | Apply rewrite |
| POST | `/api/writing/suggestions/:id/reject` | Mark rejected |
| GET | `/api/writing/metrics` | Recompute metrics for working draft |

### Error envelope

```json
{ "error": { "code": "NEEDS_SOURCES", "message": "...", "details": {} } }
```

Common codes: `VALIDATION_ERROR`, `NEEDS_SOURCES`, `NEEDS_CONTENT`, `LLM_RATE_LIMIT`, `LLM_OUTPUT_INVALID`, `FETCH_FAILED`, `NOT_FOUND`.

## 8. External dependencies

| Dependency | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Server-only |
| `GEMINI_MODEL` | Yes | Flash-class ID from AI Studio |
| `DATABASE_PATH` | No | Default `./data/editorial.db` |
| `X_BEARER_TOKEN` | No | Tweet enrichment |

## 9. Traceability (initial)

| PRD area | Requirements | Milestones |
|---|---|---|
| Part A Research | FR-001–019, NFR-001–002 | M3–M4 |
| Part B Writing | FR-050–061, NFR-010 | M6 |
| Part C Sample | FR-030–036, FR-080–081 | M5, M7 |
| Part D / Deliverables | NFR-004, NFR-006 | M7–M8 |
| Constraints | NFR-007–008, MVP_SCOPE | All |
