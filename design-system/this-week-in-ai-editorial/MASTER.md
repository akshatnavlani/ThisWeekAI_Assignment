# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/this-week-in-ai-editorial/pages/[page-name].md`.  
> If that file exists, its rules **override** this Master file.  
> If not, strictly follow the rules below.

---

**Project:** This Week in AI — Editorial Workspace  
**Generated via:** ui-ux-pro-max + Atelier UI_Example restyle  
**Updated:** 2026-11-03 (ADR-016)  
**Category:** Editorial productivity tool (not a marketing landing page)

### Design Dials (approved)

- **Variance:** 3/10 — Centered / Minimal  
- **Motion:** 3/10 — Subtle  
- **Density:** 4–5/10 — Comfortable tool density (not dashboard-dense)

---

## Product override note (important)

Workspace UI follows **Atelier Editorial** (light) and **Atelier Nocturne** (dark) from `UI_Example/` (ADR-016). Product flow remains Sources → Research → Draft → Writing. Fake Export / Publishing Checklist / profile / jargon detector are **not** product surfaces.

---

## Global Rules

### Pattern

- **Name:** Content-first editorial workspace (Atelier desk)  
- **Layout:** Top nav stage pills; stage content is the composition  
- **Hierarchy:** Brand + Studio label; one primary action per stage; manuscript is the visual anchor  
- **Anti-pattern:** Fake marketing chrome, separate Diagnostics/Publication routes, decorative AI glow

### Style

- **Name:** Atelier Editorial / Nocturne  
- **Mode:** **Light default** + **dark toggle** (`html.dark`, `localStorage` key `twiai-theme`)  
- **Keywords:** parchment / lampblack paper, hairline rules, terracotta editorial marks, sage verification  
- **Effects:** Tonal cardstock stacking; soft warm shadow only. **No** glassmorphism or glow.

### Color Palette (light — Atelier Editorial)

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Background / paper-base | `#F7F4EE` | `--color-background` |
| Surface / elevated | `#FFFFFF` | `--color-surface` |
| Surface subtle | `#EFECE6` | `--color-surface-subtle` |
| Primary ink fill | `#1F1E1D` | `--color-primary` |
| On primary | `#F7F4EE` | `--color-on-primary` |
| Editorial / secondary | `#C2593F` | `--color-secondary` |
| Sage / accent | `#768777` | `--color-accent` |
| Foreground | `#1F1E1D` | `--color-foreground` |
| Ink secondary | `#4A4742` | `--color-ink-secondary` |
| Muted foreground | `#8A847A` | `--color-muted-foreground` |
| Border | `#E2DDD5` | `--color-border` |

Dark tokens: see `html.dark` in `app/globals.css` (Atelier Nocturne).

**Writing highlight tokens**

| Check | Light | CSS Variable |
|------|-----|--------------|
| Complex | terracotta wash | `--highlight-complex` / `-bg` |
| Passive | sage wash | `--highlight-passive` / `-bg` |
| Filler | muted parchment | `--highlight-filler` / `-bg` |

### Typography

- **Display / headlines:** Newsreader  
- **Body / manuscript:** Literata  
- **Labels / metrics:** Space Mono  

```css
/* next/font — Newsreader + Literata + Space Mono */
```

**Do not use** Inter, Roboto, Arial, Libre Bodoni, or Public Sans as the designed stack (superseded by ADR-016).

### Spacing

| Token | Value |
|------|-------|
| `--space-xs` | `4px` |
| `--space-sm` | `8px` |
| `--space-md` | `16px` |
| `--space-lg` | `24px` |
| `--space-xl` | `40px` |

### Motion

Stage changes: 200ms fade. Suggestion popovers: open on hover/focus/tap; dismiss on outside / Escape.
