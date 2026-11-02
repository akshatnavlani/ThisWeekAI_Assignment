# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/this-week-in-ai-editorial/pages/[page-name].md`.  
> If that file exists, its rules **override** this Master file.  
> If not, strictly follow the rules below.

---

**Project:** This Week in AI — Editorial Workspace  
**Generated via:** ui-ux-pro-max (`--design-system`) + product overrides  
**Updated:** 2026-11-02  
**Category:** Editorial productivity tool (not a marketing landing page)

### Design Dials (approved)

- **Variance:** 3/10 — Centered / Minimal  
- **Motion:** 3/10 — Subtle  
- **Density:** 4–5/10 — Comfortable tool density (not dashboard-dense)

---

## Product override note (important)

Raw ui-ux-pro-max output initially biased toward **Modern Dark / cinematic / Inter / glassmorphism**. That conflicts with:

1. This product (reading/writing workspace, content-first)  
2. Project frontend rules (avoid dark-default, Inter, glow, purple AI clichés, cream+terracotta broadsheet)

**Authoritative direction:** light, paper-adjacent editorial tool UI from the *Magazine Style / Exaggerated Minimalism (tempered)* recommendations, adapted for a multi-stage workspace.

---

## Global Rules

### Pattern

- **Name:** Content-first editorial workspace  
- **Layout:** Single composition per stage (Sources → Brief → Draft → Assist), not a metrics dashboard  
- **Hierarchy:** Brand/product name visible; one primary action per stage; writing surface is the visual anchor  
- **Anti-pattern:** Card grids for everything, stat strips, pill clusters, decorative AI glow

### Style

- **Name:** Tempered editorial minimalism  
- **Mode:** **Light primary** (dark mode not in MVP)  
- **Keywords:** paper surface, clear type hierarchy, quiet chrome, high legibility, sparse accent  
- **Effects:** Soft borders, minimal shadow (`--shadow-sm` only for elevated panels). **No** glassmorphism, ambient blobs, or glow.

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#1E3A5F` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#334155` | `--color-secondary` |
| Accent / CTA | `#0F766E` | `--color-accent` |
| Background | `#F7F8FA` | `--color-background` |
| Surface | `#FFFFFF` | `--color-surface` |
| Foreground | `#0F172A` | `--color-foreground` |
| Muted | `#F1F5F9` | `--color-muted` |
| Muted Foreground | `#64748B` | `--color-muted-foreground` |
| Border | `#E2E8F0` | `--color-border` |
| Destructive | `#DC2626` | `--color-destructive` |
| Ring | `#1E3A5F` | `--color-ring` |

**Writing highlight tokens**

| Check | Hex | CSS Variable |
|------|-----|--------------|
| Complex sentence | `#F59E0B` (bg tint `#FEF3C7`) | `--highlight-complex` |
| Passive voice | `#2563EB` (bg tint `#DBEAFE`) | `--highlight-passive` |
| Filler / hedge | `#C026D3` (bg tint `#FAE8FF`) | `--highlight-filler` |

Accent teal chosen for trust/action without purple-AI cliché. Background is cool neutral paper — **not** warm cream `#F4F1EA`.

### Typography

- **Display / section titles:** Libre Bodoni  
- **UI + body / draft text:** Public Sans  
- **Mono (metrics, URLs, IDs):** JetBrains Mono (sparingly)

```css
/* Prefer next/font in Next.js — do not use render-blocking CSS imports in production */
/* Libre Bodoni + Public Sans + JetBrains Mono */
```

**Do not use** Inter, Roboto, Arial, or system-ui as the designed stack.

### Spacing

| Token | Value |
|------|------|
| `--space-xs` | `4px` |
| `--space-sm` | `8px` |
| `--space-md` | `16px` |
| `--space-lg` | `24px` |
| `--space-xl` | `32px` |
| `--space-2xl` | `48px` |

### Motion

- Duration **150–300ms** for UI feedback  
- Subtle fade/translate (≤12px) on stage transitions and list appear  
- Respect `prefers-reduced-motion`  
- No decorative ambient animation

### Icons

- Lucide or Heroicons SVG only — **no emoji icons**

### UX rules (from ui-ux-pro-max + product)

- Contrast ≥ 4.5:1 for body text  
- Touch targets ≥ 44×44px  
- Visible focus rings (`--color-ring`)  
- Loading: skeleton/spinner for ops > 300ms (ingestion, LLM)  
- Empty states: message + clear next action  
- Errors adjacent to the failing control  
- `cursor-pointer` on clickable elements; hover 150–300ms  

### Next.js stack notes

- Server Components by default; client only for editor interactions  
- `next/font` for Libre Bodoni + Public Sans  
- Suspense/streaming for slow LLM-bound panels where useful  

---

## Component guidance

### Primary CTA

- Background: `--color-accent` or `--color-primary` (one dominant CTA per view)  
- Avoid multiple competing filled buttons  

### Draft sections

- White surface, clear section labels in Public Sans medium  
- Section regenerate = secondary/ghost control, not competing with Analyze  

### Suggestions panel

- List with issue type chip (color-coded)  
- Accept / Reject always visible; never hover-only  

### Metrics

- Compact sidebar or footer strip; each metric has a one-line explanation  
- Do not gamify readability score  

---

## Pre-delivery checklist

- [ ] No emoji icons  
- [ ] Light-mode contrast checked  
- [ ] Focus states visible  
- [ ] `prefers-reduced-motion` respected  
- [ ] Empty/loading/error states present for Sources, Brief, Draft, Assist  
- [ ] Responsive: 375 / 768 / 1024 / 1440  
- [ ] Brand “This Week in AI” readable in chrome without overpowering the writing surface  
