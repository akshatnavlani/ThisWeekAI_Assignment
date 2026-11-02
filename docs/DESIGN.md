# Product & UX Design Specification

**Status:** Phase 1 baseline (approved MVP) — UI details refined in Phase 3  
**Last updated:** 2026-11-02

## Product vision

An AI Editorial Workspace for This Week in AI that helps editors turn raw sources into an evidence-backed research brief and a polished newsletter draft — without surrendering editorial control.

## Target user

Newsletter editor covering AI for founders, builders, and business operators.

## Goals

1. Discover a story worth telling (not merely summarize).  
2. Keep claims attributable to sources.  
3. Improve prose with Hemingway-inspired diagnostics while preserving meaning.  
4. Complete the path to a 300–500 word sample editorial inside the product.

## MVP scope

See `docs/MVP_SCOPE.md` (ADR-009).

## Visual design system

**Source of truth:** `design-system/this-week-in-ai-editorial/MASTER.md`  
**Workspace overrides:** `design-system/this-week-in-ai-editorial/pages/workspace.md`  

Generated with **ui-ux-pro-max**, then curated for an editorial writing tool (light mode, Libre Bodoni + Public Sans, navy/teal tokens, no cinematic dark/glass/glow).

Implementation must follow that system (ADR-010).

## Design principles

1. **One workflow, one project** — no dashboard theater.  
2. **Writer in control** — accept/reject; originals preserved; AI drafts labeled.  
3. **Evidence over fluency** — source links and fact/analysis separation beat pretty prose.  
4. **Honest failure** — fetch/LLM failures never invent source bodies.  
5. **Simple surfaces** — sectioned draft editor over a heavyweight CMS.  
6. **Content-first chrome** — quiet UI; the brief and draft are the visual focus.

## Core user journeys

### J1 — Sources → brief
Empty project → add ≥3 sources (URL/paste) → fix `needs_content` → Generate brief → review structured sections → optional edit / full regen.

### J2 — Brief → draft
Pick angle → Starter draft (default) or Outline only → review sectioned draft → optional per-section regenerate.

### J3 — Polish
Analyze → highlights + suggestion list + metrics → accept/reject → compare original vs revised.

## Page structure (MVP)

Single workspace with progressive stages (tabs or stepper):

1. **Sources**  
2. **Research brief**  
3. **Draft** (sectioned)  
4. **Writing assist** (can be a mode on Draft rather than separate page)

Exact layout wireframes refined in Phase 3.

## Hemingway-inspired UX (mapped)

| Pattern | Implementation |
|---|---|
| Inline problem highlights | Colored marks by check type |
| Few strong categories | Complex / Passive / Filler |
| Metrics sidebar | Count, sentence length, reading time, readability + explanations |
| Author fixes intentionally | Accept/reject per suggestion (beyond classic Hemingway) |

## States

- Empty, loading (ingestion/LLM), partial failure (`needs_content`), success, validation blocked (<3 sources), LLM error with retry.

## UX acceptance criteria

- User never loses original draft text silently.  
- Source attribution visible on brief and draft.  
- Section regenerate and writing suggestions are visually distinct actions.  
- Mobile: usable but desktop-primary (assignment evaluator likely desktop).
