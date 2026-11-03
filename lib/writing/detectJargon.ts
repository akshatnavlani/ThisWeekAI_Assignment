import type { DetectedIssue } from "@/lib/types/writing";
import { JARGON_ACRONYM_ALLOWLIST } from "./jargonAllowlist";

/** Empty corporate / hype phrasing — not core technical nouns. */
export const JARGON_BUZZWORDS = [
  "paradigm shift",
  "cutting-edge",
  "best-in-class",
  "world-class",
  "synergy",
  "synergies",
  "holistic",
  "ecosystem play",
  "value-add",
  "game-changer",
  "game changer",
  "thought leadership",
  "circle back",
  "move the needle",
  "low-hanging fruit",
  "leverage",
] as const;

const GLOSS_WINDOW = 120;

function isGlossedNearby(text: string, start: number, end: number, term: string): boolean {
  const from = Math.max(0, start - GLOSS_WINDOW);
  const to = Math.min(text.length, end + GLOSS_WINDOW);
  const window = text.slice(from, to);
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const patterns = [
    new RegExp(`${escaped}\\s*\\([^)]{2,80}\\)`, "i"),
    new RegExp(`\\([^)]{0,40}${escaped}[^)]{0,40}\\)`, "i"),
    new RegExp(`${escaped}\\s*,\\s*or\\b`, "i"),
    new RegExp(`\\bor\\s+${escaped}\\b`, "i"),
    new RegExp(`${escaped}\\s+stands\\s+for\\b`, "i"),
    new RegExp(`stands\\s+for\\s+${escaped}\\b`, "i"),
  ];

  return patterns.some((re) => re.test(window));
}

function pushUnique(
  issues: DetectedIssue[],
  issue: DetectedIssue,
): void {
  if (
    issues.some(
      (i) =>
        i.startOffset === issue.startOffset && i.endOffset === issue.endOffset,
    )
  ) {
    return;
  }
  issues.push(issue);
}

export function detectJargon(text: string): DetectedIssue[] {
  const issues: DetectedIssue[] = [];

  // Acronyms: 2–6 uppercase letters
  const acronymRe = /\b[A-Z]{2,6}\b/g;
  let m: RegExpExecArray | null;
  while ((m = acronymRe.exec(text)) !== null) {
    const term = m[0]!;
    if (JARGON_ACRONYM_ALLOWLIST.has(term.toUpperCase())) continue;
    const start = m.index;
    const end = start + term.length;
    if (isGlossedNearby(text, start, end, term)) continue;
    pushUnique(issues, {
      category: "jargon",
      passage: term,
      startOffset: start,
      endOffset: end,
    });
  }

  // Buzzwords (case-insensitive, longer phrases first)
  const lower = text.toLowerCase();
  const sorted = [...JARGON_BUZZWORDS].sort((a, b) => b.length - a.length);
  for (const phrase of sorted) {
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(phrase, from);
      if (idx < 0) break;
      const before = idx === 0 ? " " : lower[idx - 1]!;
      const afterIdx = idx + phrase.length;
      const after = afterIdx >= lower.length ? " " : lower[afterIdx]!;
      const boundaryBefore = !/[a-z0-9]/i.test(before);
      const boundaryAfter = !/[a-z0-9]/i.test(after);
      if (boundaryBefore && boundaryAfter) {
        pushUnique(issues, {
          category: "jargon",
          passage: text.slice(idx, idx + phrase.length),
          startOffset: idx,
          endOffset: idx + phrase.length,
        });
      }
      from = idx + phrase.length;
    }
  }

  return issues.sort((a, b) => a.startOffset - b.startOffset);
}
