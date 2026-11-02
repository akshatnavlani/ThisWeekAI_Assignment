# MVP Scope — AI Editorial Workspace

**Status:** Approved  
**Date:** 2026-11-02  
**Product:** This Week in AI — AI Editorial Workspace

## Product vision (MVP)

Help a newsletter editor go from raw sources to an evidence-backed research brief, then to a polished ~300–500 word editorial draft — with Hemingway-inspired writing assistance that preserves meaning and technical nuance.

## Primary user

A This Week in AI newsletter editor (or FDE evaluating that workflow) who needs to discover a story worth telling and improve a draft without losing authorial control.

## Core workflow

1. Create / open a local editorial project  
2. Add ≥3 sources (URL and/or paste; optional X API for tweet URLs)  
3. Ingest & extract content (with failure → paste recovery)  
4. Generate structured research brief (facts vs analysis, evidence links, angles)  
5. Optionally edit brief; optionally full-regenerate brief  
6. Select angle → generate **starter draft** (default) or **outline only**  
7. Optionally regenerate individual **draft sections**  
8. Run Writing Assistant (highlights, explanations, rewrites, accept/reject)  
9. Compare original vs revised; review metrics  
10. Export/use sample editorial + before/after for submission artifacts  

## In scope

| Area | Capability |
|---|---|
| Workspace | Single local durable project (no auth); optional tiny recent-projects list later if cheap |
| Sources | Mixed URL + paste; article fetch/extract; tweet URL optional X enrichment; ≥3 usable sources gate |
| Research | Structured brief; facts vs analysis; source links; ≥1 newsletter angle; evidence-oriented claims |
| Brief tooling | View, light edit, full regenerate |
| Drafting | Angle → starter draft or outline-only; labeled AI-assisted starter |
| Draft tooling | Per-section regenerate for fixed Part C sections |
| Writing | 3 checks (complex sentences, passive, filler); inline highlights; explain + rewrite; accept/reject; original preserved; compare; metrics + explanations |
| Delivery | Local-first; free-tier deploy after E2E works |
| Submission | Sample 300–500 word piece; before/after; README; product/engineering note |

## Out of scope (MVP)

- User accounts, auth, multi-tenant cloud projects (stretch only after E2E)  
- Publishing / CMS / email send  
- Per-section regenerate on the research brief  
- Hemingway feature-parity (exact colors, adverb-only category, clone UX)  
- Hard “unexplained jargon” as a fourth writing check  
- Multi-agent orchestration frameworks as a default  
- Provider abstraction for hypothetical future LLMs beyond what’s needed for Gemini/Groq choice  
- Real-time collaboration  

## Success metrics (product usefulness)

- Editor can produce a brief that surfaces a non-obvious angle from ≥3 sources  
- Claims in brief/draft can be traced to source links  
- Writing Assistant suggestions are rejectable and do not silently overwrite  
- Sample editorial is specific, useful to founders/builders/operators, not a generic summary  

## Approved decision references

ADR-001 … ADR-008, plus this scope approval (ADR-009).
