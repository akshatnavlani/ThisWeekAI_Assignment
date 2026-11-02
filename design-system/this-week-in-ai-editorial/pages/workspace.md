# Page override: Editorial Workspace

Overrides `MASTER.md` for the main app shell (Sources / Research / Draft / Writing).

## Layout

- Sticky top bar: brand (“This Week in AI” + Studio) + **stage nav pills** + theme toggle + project title  
- Main column: active stage content (max-width ~1440px)  
- Writing: control deck + manuscript + **metrics rail** (hidden in Focus mode)  
- No Export, Publishing Checklist, profile avatar, or Live Sync chrome  

## Stage-specific

### Sources
- Omnibar-style URL + optional paste  
- Kind filter chips (all / url / paste / tweet / other)  
- Archival source cards with status chips  
- Primary CTA: **Generate research brief** (≥3 ready)

### Research brief
- Two-column on `lg+`: corpus index + brief dossier  
- Markdown display for narrative fields; Edit toggles textareas  
- Angle cards; Continue / Full regenerate  

### Draft
- Mode toggle: Starter draft | Outline only  
- Section panels with Preview MD / Edit + terracotta Regenerate  
- Primary CTA: **Analyze writing**

### Writing assist
- Inline highlights; **hover/tap popover** (explanation, rewrite, Accept/Reject) — no separate suggestion list  
- Category filter chips (complex / passive / filler only)  
- Compare + MD preview modes; Focus mode hides chrome/rail  
- Metrics rail with explanations  

## Responsive

- `<lg`: single column; stage pills scroll horizontally  
- Touch: tap highlights to open suggestion popovers  
