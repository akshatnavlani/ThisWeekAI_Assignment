# Project Progress

**Last updated:** 2026-11-03

## Current phase

**Implementation — M0–M8 complete; Atelier UI restyle (ADR-016) complete**

## Current milestone

UI — Atelier dual-theme restyle (**complete**)

## Completed

- [x] Phase 0–3 planning
- [x] ADR-001 … ADR-016
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
- [x] **UI — Atelier light/dark restyle** (fonts, top-nav stages, MD display, hover suggestions)

### M8 verification log (2026-11-03)

See prior PROGRESS / git history for Docker Compose smoke and Render URL blocker.

### UI restyle verification log (2026-11-03)

| Check | Result | Notes |
|---|---|---|
| Fonts Newsreader / Literata / Space Mono | **PASS** | `app/layout.tsx` via `next/font` |
| Light + dark tokens + toggle | **PASS** | `html.dark`, `twiai-theme` localStorage |
| Stage pills top nav | **PASS** | No Export/Checklist |
| Markdown display | **PASS** | `react-markdown` + `remark-gfm` on brief/draft read views |
| Hover/tap suggestion popovers | **PASS** | Replaces primary suggestion list; metrics stay in Writing |
| `npm run build` | **PASS** | After restyle |

## In progress

- (none)

## Pending

- Public Render live URL (account/disk) — optional for reviewers

## Decisions awaiting approval

None.

## Blockers

- **Public Solution Live Link:** requires Render login + persistent-disk-capable plan.

## Confirmed decisions

ADR-001 … ADR-016 (see `docs/DECISIONS.md`)

## Explicit assumptions

See `docs/PLANNING_AUDIT.md`. UI authority: ADR-016 + `design-system/this-week-in-ai-editorial/`.
