# Project Progress

**Last updated:** 2026-11-03

## Current phase

**Implementation — M0–M8 complete**

## Current milestone

M8 — Docker + SQLite deploy (**complete**; public Render URL blocked)

## Completed

- [x] Phase 0–3 planning
- [x] ADR-001 … ADR-015
- [x] README submission shape (ADR-012)
- [x] **M0 — Project foundation**
- [x] **M1 — Database + project persistence**
- [x] **M2 — Workspace UI shell**
- [x] **M3 — Source ingestion**
- [x] **M4 — Research Assistant**
- [x] **M5 — Draft generation + section regen**
- [x] **M6 — Writing Assistant**
- [x] **M7 — Sample artifacts + live E2E**
- [x] **M8 — Docker + SQLite deploy path**

### M0–M6

See earlier verification logs in git history / prior PROGRESS snapshots.

### M7 verification log (2026-11-03)

| Check | Result | Notes |
|---|---|---|
| `npm test` / `npm run build` | **PASS** | Regression gate before live run |
| Gemini env present | **PASS** | `.env` had key; model in `.env` was Live-only → E2E used override `GEMINI_MODEL=gemini-3.8-flash` |
| J1 Sources ≥3 ready | **PASS** | OpenAI GPT-4o mini, Google Gemini Flash, Anthropic Claude 3.5 Sonnet (URL + paste) |
| J1 Brief generate | **PASS** | Live Gemini; angle “Race to the Bottom on Price…” |
| J2 Starter draft | **PASS** | ~384 words; implication section regen once |
| J3 Analyze + accept≥2 + reject≥1 | **PASS** | 2 accept / 1 reject; original snapshot preserved |
| Artifacts written | **PASS** | `sample-editorial.md`, `before-after-writing.md`, `PRODUCT_ENGINEERING_NOTE.md` |
| Live Gemini (overall) | **Verified for M7 capture** | Transient 503/429 during draft/analyze; retries succeeded |

**URLs used**

- https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/
- https://developers.googleblog.com/en/gemini-15-flash-8b-is-now-generally-available-for-use/
- https://www.anthropic.com/news/claude-3-5-sonnet

### M8 verification log (2026-11-03)

| Check | Result | Notes |
|---|---|---|
| `Dockerfile` / Compose / `render.yaml` | **PASS** | ADR-015; `next.config` `output: "standalone"` |
| `docker compose build` | **PASS** | Linux rebuild of `better-sqlite3` |
| Container smoke `GET /api/projects/current` | **PASS** | HTTP 200 on host port 3005 (3000 busy); DB on `./data` volume |
| Public Render live URL | **BLOCKED** | No Render CLI/credentials; disk needs eligible plan — documented in README |
| Secrets / `*.db` in git | **PASS** | Not committed; `.dockerignore` excludes `.env` and `data/` |

## In progress

- (none)

## Pending

- (none for MVP milestones)

## Decisions awaiting approval

None.

## Blockers

- **Public Solution Live Link:** requires Render login + persistent-disk-capable plan. Docker Compose is the verified reproducible path (ADR-006).

## Confirmed decisions

ADR-001 … ADR-015 (see `docs/DECISIONS.md`)

## Explicit assumptions

See `docs/PLANNING_AUDIT.md`. ORM choice resolved by ADR-014. Deploy unit = Docker (ADR-015).
