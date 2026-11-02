# Phase 2 — Technology Research Notes

**Status:** Approved via ADR-010 (stack + ui-ux-pro-max design system)  
**Date:** 2026-11-02

## LLM providers

### Gemini (Google AI Studio)

- User already has API keys.  
- Strong fit for long multi-source research context and JSON/structured output.  
- Free tier exists; limits are per project/model (RPM/TPM/RPD). Published third-party summaries often cite ~15 RPM / ~1,500 RPD for Flash-class models — **verify in AI Studio for the live project**.  
- As of 2026-06-01, Gemini 2.0 Flash family is shut down; target current Flash-class IDs (e.g. `gemini-2.5-flash` / `gemini-3.5-flash` — confirm at implementation time against AI Studio).  
- Suitable as **primary** model for brief, draft, section regen, and writing rewrites.

### Groq

- Very fast inference; free/dev limits are restrictive and model lineup has shifted (Llama production often enterprise; structured-output strict mode only on select models).  
- Useful as optional speed fallback, but dual-provider abstraction is weak ROI for this assignment.  
- **Recommendation:** Gemini-only for MVP; document Groq as optional future if Gemini rate limits block demos. No LangChain/agent framework required.

## App shape vs deploy

- **Vercel + local SQLite file:** poor fit (ephemeral FS).  
- **Local SQLite + later free VM/PaaS (Render/Railway/Fly):** good fit for ADR-002 + ADR-006.  
- **Vercel + Turso/libSQL:** viable if we insist on Vercel; adds account/vendor.  

## Ingestion

- `fetch` + HTML readability extraction (`@mozilla/readability` + DOM parser) is enough for MVP articles.  
- Paywalls/JS-heavy pages → paste path (ADR-003).  
- Optional X API when token present.

## Writing analysis

- Deterministic NLP-lite detectors (sentence split, passive heuristics, filler lexicon) + Gemini for explain/rewrite (ADR-005).  
- No need for a heavy editor framework if draft is **sectioned textareas/panels** (aligns with ADR-008).
