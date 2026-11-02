# Project Progress

**Last updated:** 2026-11-03

## Current phase

**Implementation — M0–M4 complete; M5 not started**

## Current milestone

M4 — Research Assistant (**complete**)

## Completed

- [x] Phase 0–3 planning
- [x] ADR-001 … ADR-014
- [x] README submission shape (ADR-012)
- [x] **M0 — Project foundation**
- [x] **M1 — Database + project persistence**
- [x] **M2 — Workspace UI shell**
- [x] **M3 — Source ingestion**
- [x] **M4 — Research Assistant**

### M0–M3

See earlier verification logs in git history / prior PROGRESS snapshots. Summaries remain: foundation, SQLite project API, workspace shell, and source ingest verified.

### M4 verification log

| Check | Result | Notes |
|---|---|---|
| Gemini client + brief prompt + Zod schema | **Implemented** | `lib/llm/**`; one repair retry |
| `validateSourceIds` + `generateBrief` + research repo | **Implemented** | Replace angles/claims on full generate |
| `POST /api/research/generate`, `PATCH /api/research/brief` | **Implemented** | Gate `NEEDS_SOURCES`; hydrate `brief` on project GET |
| Sources Generate + Research UI (edit/regen/continue) | **Implemented** | Continue → draft stage only (no draft API) |
| `npm test` | **Verified PASS** | 28 tests incl. schema, sourceIds, mocked generate/repair/gate |
| `npm run build` | **Verified PASS** | Research routes registered |
| Live Gemini end-to-end with real API key | **Not verified** | Requires `GEMINI_API_KEY` + `GEMINI_MODEL` in local `.env` |

## In progress

- (none)

## Pending

- [ ] M5 Draft
- [ ] M6 Writing
- [ ] M7 Sample artifacts
- [ ] M8 Deploy + README finalize

## Decisions awaiting approval

None for M4.

## Blockers

None.

## Confirmed decisions

ADR-001 … ADR-014 (see `docs/DECISIONS.md`)

## Explicit assumptions

See `docs/PLANNING_AUDIT.md`. ORM choice resolved by ADR-014.
