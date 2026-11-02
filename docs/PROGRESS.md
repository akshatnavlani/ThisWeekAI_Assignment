# Project Progress

**Last updated:** 2026-11-03

## Current phase

**Implementation — M0–M5 complete; M6 not started**

## Current milestone

M5 — Draft generation + section regen (**complete**)

## Completed

- [x] Phase 0–3 planning
- [x] ADR-001 … ADR-014
- [x] README submission shape (ADR-012)
- [x] **M0 — Project foundation**
- [x] **M1 — Database + project persistence**
- [x] **M2 — Workspace UI shell**
- [x] **M3 — Source ingestion**
- [x] **M4 — Research Assistant**
- [x] **M5 — Draft generation + section regen**

### M0–M4

See earlier verification logs in git history / prior PROGRESS snapshots. Summaries remain: foundation, SQLite project API, workspace shell, source ingest, and research briefs verified.

### M5 verification log

| Check | Result | Notes |
|---|---|---|
| Draft types + `workingPlainFromSections` + drafts repo | **Implemented** | Hydrate `draft` on `GET /api/projects/current` |
| Gemini draft schema/prompts + `generateDraft` / `regenerateSection` | **Implemented** | Sources section deterministic; one repair retry |
| `POST /api/draft/generate`, section PATCH + regenerate | **Implemented** | Modes `starter_draft` \| `outline_only`; snapshot set once on first starter |
| Research angle select + DraftStage generate/edit/regen | **Implemented** | Analyze writing still disabled (M6) |
| `npm test` | **Verified PASS** | 43 tests incl. draft keys, sources section, generate/regen/snapshot |
| `npm run build` | **Verified PASS** | Draft routes registered |
| Live Gemini end-to-end with real API key | **Not verified** | Requires `GEMINI_API_KEY` + `GEMINI_MODEL` in local `.env` |

## In progress

- (none)

## Pending

- [ ] M6 Writing
- [ ] M7 Sample artifacts
- [ ] M8 Deploy + README finalize

## Decisions awaiting approval

None for M5.

## Blockers

None.

## Confirmed decisions

ADR-001 … ADR-014 (see `docs/DECISIONS.md`)

## Explicit assumptions

See `docs/PLANNING_AUDIT.md`. ORM choice resolved by ADR-014.
