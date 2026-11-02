# Risks & Mitigations

**Last updated:** 2026-11-03

| ID | Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|---|
| R-01 | Gemini free-tier rate limits (429) during demos | High | Medium | Single Flash model; batch writing rewrites; backoff UX; cache brief; document limits |
| R-02 | Source extraction fails (paywall/JS/bot block) | High | High | Paste fallback (ADR-003); never invent body text |
| R-03 | LLM hallucinated facts/URLs | High | Medium | Structured sourceIds; validate IDs exist; prompt constraints; UI shows only known sources |
| R-04 | Malformed LLM JSON | Medium | Medium | Zod + one repair retry; visible failure |
| R-05 | Evidence attribution weak (“sounds cited”) | High | Medium | Evidence_claim rows; reject claims with empty/invalid sourceIds in validator |
| R-06 | Suggestion offset drift after edits | Medium | High | Invalidate pending suggestions on text change; re-analyze |
| R-07 | Overlapping accepts corrupt draft | Medium | Medium | Non-overlap filter; apply from end→start offsets |
| R-08 | SSRF via user URLs | High | Low | Scheme/IP/redirect guards; size/time limits |
| R-09 | X API missing/billing | Low | High | Optional path only; paste for tweets (ADR-011: no scrape/third-party core path) || R-10 | SQLite on free PaaS ephemeral disk | Medium | Medium | Docker + Render disk at `/data` (ADR-015); Compose local volume; document blocker if disk plan unavailable; never use Vercel+file SQLite |
| R-11 | Scope creep (agents, multi-project, jargon check) | Medium | Medium | ADR-009 exclusions; milestone DoD |
| R-12 | Gemini 2.0 model shutdown / ID churn | Medium | Medium | Resolve model ID at setup time from AI Studio; put in env `GEMINI_MODEL` |
| R-13 | Writing detectors false positives | Low | High | Easy reject; tune thresholds; unit tests |
| R-14 | Dual draft tools confuse users (section regen vs suggestions) | Medium | Medium | Distinct labels/placement per workspace.md |
| R-15 | Disk space on Windows (dev machine ~95% full) | Medium | Medium | Keep node_modules lean; clean build artifacts |

## Residual accepted risks

- Unprotected deployed demo (no auth) — acceptable for take-home if disclosed.  
- Deterministic passive/filler heuristics imperfect — acceptable with reject UX.
