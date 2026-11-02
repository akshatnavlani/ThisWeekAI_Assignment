# AGENTS.md — This Week in AI Editorial Workspace

## Project purpose

Build a lightweight **AI Editorial Workspace**: sources → evidence-backed research brief → newsletter draft → Hemingway-inspired writing assist.

## Authority documents (read before coding)

1. `docs/MVP_SCOPE.md`  
2. `docs/DECISIONS.md` (ADR-001…010)  
3. `docs/TECHNICAL_REQUIREMENTS.md`  
4. `docs/ARCHITECTURE.md`  
5. `docs/SCHEMA.md`  
6. `docs/IMPLEMENTATION_PLAN.md`  
7. `docs/RISKS.md`  
8. `design-system/this-week-in-ai-editorial/MASTER.md` (+ `pages/workspace.md`)  
9. `docs/PROGRESS.md`  

## Technology stack (ADR-010)

- Next.js App Router + TypeScript  
- SQLite local file  
- Gemini only (no Groq unless new ADR)  
- Tailwind + design-system tokens  
- Newsreader + Literata + Space Mono via `next/font` (ADR-016) — **never Inter as primary**  
- Lucide icons — no emoji icons  
- Light + dark Atelier themes (`html.dark`); no Export/Checklist fake chrome  

## Architectural principles

- Unified single project workflow; no auth in MVP  
- Deterministic detectors + LLM rewrites for writing  
- Validate all LLM JSON with Zod; never trust raw model output  
- Never invent source body text on fetch failure  
- Claims must reference real `source_id`s  
- No LangChain/multi-agent frameworks  
- No provider abstraction for hypothetical LLMs  
- Do not design for hosted multi-tenant Option 3 in MVP  

## Coding conventions

- Server Components by default; `"use client"` only for interactive editor pieces  
- Keep services in `lib/*` thin and testable  
- Match existing style; no speculative abstractions  
- Secrets only via env; never commit `.env`  

## Testing expectations

- Unit test detectors, overlap resolver, SSRF guards, Zod schemas  
- Integration test APIs with mock Gemini + temp SQLite  
- Update PROGRESS with verified vs implemented  

## Security expectations

- SSRF protections on all user URLs  
- Timeouts and size limits on fetch  
- API keys server-side only  

## Documentation

- Update ADRs for material changes  
- Keep PROGRESS and IMPLEMENTATION_PLAN consistent  
- README commands must be actually tested before claiming  
- **Git push:** Docs/README/design-system markdown **may be pushed** to origin (ADR-013). Never push secrets, `node_modules`, `.next`, or DB files.  

## Prohibited shortcuts

- Coding before `APPROVE PLAN AND AUTHORIZE IMPLEMENTATION` (planning phase)  
- Claiming features work without verification  
- Silent scope expansion (jargon check, brief section regen, auth, etc.)  
- Dark cinematic / glass / glow UI or Inter-first typography  

## Implementation gate

Do not implement application features until the user explicitly sends:

`APPROVE PLAN AND AUTHORIZE IMPLEMENTATION`

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
