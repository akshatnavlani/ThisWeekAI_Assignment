# Page override: Editorial Workspace

Overrides `MASTER.md` for the main app shell (Sources / Research / Compose — ADR-019).

## Layout

- Sticky top bar: brand (“This Week in AI” + Studio) + **stage nav pills** + theme toggle + project title  
- Main column: active stage content (max-width ~1440px)  
- Compose Writing assist: control deck + manuscript + **metrics rail**  
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

### Compose
- Before start: angle picker + **Blank canvas** | **Starter draft** (outline removed)  
- After start: toolbar with Start over (returns to Blank/Starter), Drafting / Writing assist toggle, Add section, Analyze, exports  
- Drafting: freeform section cards (title, purpose, content); add/remove; optional Generate this section  
- Writing assist: inline highlights; hover/tap popover (Accept/Reject); compare + MD preview  
- Live metrics rail in both modes; workingPlain uses real title as H1 (no `## Headline` label)

## Responsive

- `<lg`: single column; stage pills scroll horizontally  
- Touch: tap highlights to open suggestion popovers  
