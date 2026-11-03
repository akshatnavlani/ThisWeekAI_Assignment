import type { DetectedIssue } from "@/lib/types/writing";

/**
 * Weak intensifying adverbs. Omits ones already covered strongly by filler
 * (really, basically, literally, simply, quite, rather) — overlap would drop them anyway.
 */
export const WEAK_ADVERBS = [
  "clearly",
  "obviously",
  "completely",
  "extremely",
  "highly",
  "incredibly",
  "remarkably",
  "significantly",
  "substantially",
  "totally",
  "absolutely",
  "definitely",
  "certainly",
  "undoubtedly",
  "arguably",
  "interestingly",
  "importantly",
  "notably",
] as const;

export function detectAdverb(text: string): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const lower = text.toLowerCase();

  for (const word of WEAK_ADVERBS) {
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(word, from);
      if (idx < 0) break;
      const before = idx === 0 ? " " : lower[idx - 1]!;
      const afterIdx = idx + word.length;
      const after = afterIdx >= lower.length ? " " : lower[afterIdx]!;
      const boundaryBefore = !/[a-z0-9]/i.test(before);
      const boundaryAfter = !/[a-z0-9]/i.test(after);
      if (boundaryBefore && boundaryAfter) {
        issues.push({
          category: "adverb",
          passage: text.slice(idx, idx + word.length),
          startOffset: idx,
          endOffset: idx + word.length,
        });
      }
      from = idx + word.length;
    }
  }

  return issues;
}
