# Page override: Editorial Workspace

Overrides `MASTER.md` for the main app shell (Sources / Brief / Draft / Assist).

## Layout

- Top bar: product name + stage stepper (Sources → Research → Draft → Writing)  
- Main column: active stage content (dominant)  
- Optional right rail: metrics + suggestions (Draft/Writing stages only)  
- No marketing hero, subscribe form, or archive grid  

## Stage-specific

### Sources
- List of source rows with status chips (`ready` / `needs_content` / `failed`)  
- Add URL and/or paste in one clear form  
- Primary CTA: **Generate research brief** (disabled until ≥3 usable sources)

### Research brief
- Structured sections stacked vertically  
- Full regenerate secondary; light edit inline  
- Primary CTA: **Continue to draft**

### Draft
- Mode toggle: Starter draft | Outline only  
- Section cards/panels with per-section **Regenerate**  
- Primary CTA: **Analyze writing**

### Writing assist
- Inline highlights in draft text  
- Suggestion list with Accept/Reject  
- Compare original vs revised toggle  
- Metrics with explanations always visible  

## Motion

Stage changes: 200ms fade. Suggestion appear: short stagger ≤40ms each, max 6 visible without scroll cue.
