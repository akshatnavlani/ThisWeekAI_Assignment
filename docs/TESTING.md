# Testing — edge cases & M9 features

**Status:** Active  
**Last updated:** 2026-11-03  
**Scope:** Manual + automated checks for Sources → Research → Draft → Writing, images, and exports (ADR-017).

Use **Setup → Steps → Expected → Severity**. Severity: `blocker` | `major` | `minor`.

Automated anchors: `npm test` (Vitest). Cross-links below name the test file when one exists.

---

## A1. Sources — mixed input & errors

| ID | Setup | Steps | Expected | Severity | Auto |
|---|---|---|---|---|---|
| S1 | Empty project | Paste-only body, no URL | `ready`, modality `paste`, kind `other`, content = paste | blocker | `tests/ingestion/ingest.test.ts` |
| S2 | Mock HTML page | URL-only successful fetch | `ready`, extracted body, no invented lorem | blocker | ingest.test |
| S3 | Mock HTML + paste | Submit URL and paste together | Content = extracted + blank line + paste; modality `url_and_paste` | major | ingest.test |
| S3b | Mixed blob (tweet + article + image URL + notes) | POST `/api/sources/mixed` | Separate sources for tweet/article; image on primary; prose shared | major | parseMixedInput.test |
| S3c | Source body cites other URLs | Card shows “Add mentioned” | Creates new sources; skips duplicates | major | extractMentionedUrls.test |
| S4 | Fetch throws | URL-only failure | `needs_content`, empty content, `errorMessage` set (e.g. `HTTP 403`) | blocker | ingest.test |
| S5 | Fetch fails + paste | URL + paste on failure | `ready`, paste kept, `errorMessage` retained; UI warning “using pasted text” | major | ingest.test |
| S6 | `needs_content` row | Paste recovery → Save | Status → `ready`, content saved | blocker | manual |
| S7 | Source with URL | Retry | Re-fetches; updates content/status | major | manual |
| S8 | Private IP / non-http URL | Add source | Rejected (SSRF / validation); no invent | blocker | ssrf tests |
| S9 | Tweet URL, no `X_BEARER_TOKEN` | Add without paste | `needs_content` + clear message | major | ingest.test |
| S10 | Tweet URL + paste, X fails | Add | `ready` with paste | major | ingest.test |
| S11 | Mixed kinds | Filter Article / Tweet / Other | Filters by `kind`, not modality | minor | manual |
| S12 | <3 ready sources | Generate brief | Blocked; shows N/3 | blocker | manual |
| S13 | ≥3 ready | Generate brief | Proceeds to Research | blocker | manual |

**Error UX:** Chip + human-readable reason + raw detail in mono; Retry when URL present; Paste recovery only for `needs_content`.

**Wrong facts:** App does not refute false articles. Corpus is treated as given. Fetch failure never invents body; brief/draft cite only real `source_id`s.

---

## A2. Research brief

| ID | Setup | Steps | Expected | Severity |
|---|---|---|---|---|
| R1 | 3 ready sources | Generate | Brief with angles; claims have valid `sourceIds` | blocker |
| R2 | Model returns unknown id | Generate / sanitize | Unknown IDs stripped (`lib/research/validateSourceIds.ts`) | major |
| R3 | Existing brief | Light edit + save | Persists | major |
| R4 | Existing brief | Full regenerate | Replaces brief; edit surface intact | major |
| R5 | Ready + `errorMessage` (paste fallback) | Generate | Source still usable | major |
| R6 | Any brief view | Read helper copy | Honesty note: sources not fact-checked | minor |

---

## A3. Draft — structure, Headline, edit UX

| ID | Setup | Steps | Expected | Severity |
|---|---|---|---|---|
| D1 | Brief with angle | Generate starter | Sections: Headline, What happened, Context, Analysis, Implication, Sources | blocker |
| D2 | Same | Outline only | Outline content in sections | major |
| D3 | Draft with headline text | View read mode | Large headline content; subtle “Headline” label — not “Headline” twice competing | major |
| D4 | Model content starts with `## Headline` | Persist / rebuild plain | No double `## Headline` wrapper | major |
| D5 | Section in read mode | Edit → change → Done/blur | PATCH saves; returns to read | blocker |
| D6 | Section | Regenerate vs Analyze writing | Labels distinct; regen replaces section; analyze opens Writing | major |
| D7 | Edit sections | Watch aside | Live metrics update without analyze | major |

---

## A4. Writing assist & metrics

| ID | Setup | Steps | Expected | Severity | Auto |
|---|---|---|---|---|---|
| W1 | Non-empty draft | Analyze | Suggestions + metrics from `computeMetrics` only | blocker | — |
| W2 | Same text client vs server | Compare scores | Live client metrics match server on identical text | major | metrics.test |
| W3 | Empty / short / long prose | Score Flesch | Empty → 0; denser prose tends lower ease | major | `tests/writing/metrics.test.ts` |
| W4 | Pending suggestion | Accept / Reject | Text updates / dismissed; original snapshot preserved | blocker | — |
| W5 | After analyze | Compare | Original vs revised | major | — |
| W6 | Empty draft | Analyze | Blocked with clear error | major | — |
| W7 | Draft with `QTX` unexplained | Analyze | `jargon` suggestion; allowlisted `API` not flagged | major | detectJargon.test |
| W8 | `QTX (Quantum Thing X)` | Analyze | No jargon on that acronym | major | detectJargon.test |
| W9 | Weak adverb / weasel phrase | Analyze | `adverb` / `weasel` chips; overlap priority holds | major | detectAdverb/Weasel + overlap |

**Check inventory (ADR-018):** complex → jargon → passive → adverb → filler → weasel.

**Readability copy:** “Flesch Reading Ease (0–100, higher = easier). Informational only — not AI-scored.”

---

## A5. Images (og + upload) & export (MD + PDF)

| ID | Setup | Steps | Expected | Severity |
|---|---|---|---|---|
| I1 | HTML with `og:image` | Ingest URL | Absolute `imageUrl` stored; card preview | major |
| I2 | HTML without og | Ingest | `imageUrl` null; no crash | major |
| I3 | Ready source | Upload JPEG/PNG/WebP ≤2 MB | Stored under data dir; served via `/api/uploads/...`; upload wins display | major |
| I4 | Oversize or wrong MIME | Upload | Clear error; no write | major |
| I5 | `../` in upload path | GET upload | Path traversal rejected | blocker |
| I6 | Source with image | (Removed) Sources no longer has “Add to draft”; use Image upload / Clear image only | n/a |
| E1 | Draft exists | Copy Markdown | Clipboard = `workingPlain` (or error shown) | major |
| E2 | Draft exists | Download `.md` | File equals `workingPlain` | major |
| E3 | Brief exists | Download brief MD | Non-empty brief markdown | minor |
| E4 | Draft exists | Download PDF | Readable PDF with sections; same-origin images when resolvable; remote fail skipped | major |
| E5 | Docker / Render volume | Upload then restart | File still served from `{dirname(DATABASE_PATH)}/uploads` | major |

---

## A6. Regression / deploy smoke

| ID | Steps | Expected | Severity |
|---|---|---|---|
| X1 | `GET /api/health` | 200 healthy | blocker |
| X2 | Theme toggle | Light ↔ dark persists | minor |
| X3 | API error bodies | No API keys / secrets | blocker |
| X4 | `npm test` | All pass | blocker |
| X5 | `npm run build` | Succeeds | blocker |

---

## Commands

```bash
npm test
npm run build
npm run dev
```
