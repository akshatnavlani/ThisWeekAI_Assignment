# Project Progress

**Last updated:** 2026-11-03

## Current phase

**Implementation — M0–M10 + Compose (ADR-019) complete**

## Current milestone

**Compose stage merge** (ADR-019) — **complete**

## Completed

- [x] Phase 0–3 planning
- [x] ADR-001 … ADR-019
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
- [x] **M9 — Testing + edge fixes** (ADR-017)
- [x] **M10 — Writing checks expansion** (ADR-018)
- [x] **Compose — merge Draft + Writing** (ADR-019): Blank/Starter, freeform sections, change-angle clear, drafting ↔ writing assist

### Compose (ADR-019) verification (2026-11-03)

| Check | Result | Notes |
|---|---|---|
| Migration `purpose` + stage/mode coerce | **PASS** | `0002_compose_sections.sql` with statement breakpoints |
| workingPlain H1 headline (no `## Headline`) | **PASS** | Unit tests |
| Blank / add-remove section / change-angle clear | **PASS** | `tests/draft/composeDraft.test.ts` |
| Generate rejects `outline_only` | **PASS** | Zod `starter_draft` only |
| Nav Sources \| Research \| Compose | **PASS** | `ComposeStage` + shell |
| `npm test` | **PASS** | 93 tests |
| `npm run build` | **PASS** | Routes include blank / change-angle / sections CRUD |

### Compose UX polish (2026-11-03)

| Check | Result | Notes |
|---|---|---|
| articlePlain for MD preview/export | **PASS** | No scaffolding `## What happened` etc. |
| Section reorder Up/Down + API | **PASS** | `POST /api/draft/sections/reorder` |
| Purpose only when Generate | **PASS** | Schema refine + modal |
| Regen key mismatch tolerance | **PASS** | Title match accepted |
| Export menu; Brief .md removed | **PASS** | Compose toolbar |
| Research angles → Compose only | **PASS** | Continue to Compose |
| `npm test` / `npm run build` | **PASS** | 97 tests; reorder route in build |

### Live browser E2E (2026-11-03)

| Check | Result | Notes |
|---|---|---|
| Tech / politics / stocks / overlap in Cursor browser | **PASS** | Pre-Compose: Sources→Brief→Draft→Writing→Export |
| Starter vs Outline modes | **PASS (historical)** | Superseded by Blank/Starter (ADR-019) |
| Writing analyze + Accept/Reject | **PASS** | No crash; chips populated |
| Artifacts | **PASS** | `artifacts/e2e-2026-11-03/` — see `RUNLOG.md` |
| Overlap synthesis | **PASS** | Cross-field brief; real source ids; no card dedupe |

### M10 verification log (2026-11-03)

| Check | Result | Notes |
|---|---|---|
| ADR-018 six-check inventory | **PASS** | complex, jargon, passive, adverb, filler, weasel |
| Detectors + overlap priority | **PASS** | Unit tests |
| Writing chips + highlight tokens | **PASS** | Light/dark CSS |
| `npm test` | **PASS** | 89 tests |
| `npm run build` | **PASS** | After M10 |
| Manual analyze smoke in browser | **PASS** | Covered by live browser E2E `RUNLOG.md` |

### M9 verification log (2026-11-03)

| Check | Result | Notes |
|---|---|---|
| `docs/TESTING.md` | **PASS** | Edge suite A1–A6 authored |
| ADR-017 | **PASS** | Draft read/edit, live metrics, images, MD+PDF |
| Source error UX + honesty | **IMPLEMENTED** | Mapped titles; paste-fallback warning; corpus disclaimer |
| Draft read/Edit + Headline normalize | **IMPLEMENTED** | Unit tests for normalize |
| Live `computeMetrics` | **IMPLEMENTED** | Draft aside + Writing panel |
| og:image + upload | **IMPLEMENTED** | `image_url` migration; `/api/sources/[id]/image`; `/api/uploads/...` |
| Markdown + PDF export | **IMPLEMENTED** | Draft + Writing controls; jspdf client |
| `npm test` | **PASS** | 76 tests |
| `npm run build` | **PASS** | Routes include image + uploads |
| Full manual TESTING.md E2E in browser | **SKIPPED** | Automated + build verified; browser path left for reviewer |

## In progress

- (none)

## Pending

- Public Render live URL (account/disk) — optional for reviewers

## Decisions awaiting approval

None.

## Blockers

- **Public Solution Live Link:** requires Render login + persistent-disk-capable plan.

## Confirmed decisions

ADR-001 … ADR-019 (see `docs/DECISIONS.md`)

## Explicit assumptions

See `docs/PLANNING_AUDIT.md`. UI authority: ADR-016/017 + `design-system/this-week-in-ai-editorial/`.
