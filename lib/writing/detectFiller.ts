import type { DetectedIssue } from "@/lib/types/writing";

/** Longer phrases first so multi-word matches win. */
export const FILLER_PHRASES = [
  "it is important to note",
  "due to the fact that",
  "in order to",
  "as a matter of fact",
  "needless to say",
  "for all intents and purposes",
  "at the end of the day",
  "essentially",
  "basically",
  "actually",
  "really",
  "very",
  "just",
  "quite",
  "rather",
  "simply",
  "literally",
] as const;

export function detectFiller(text: string): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const lower = text.toLowerCase();

  for (const phrase of FILLER_PHRASES) {
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
        issues.push({
          category: "filler",
          passage: text.slice(idx, idx + phrase.length),
          startOffset: idx,
          endOffset: idx + phrase.length,
        });
      }
      from = idx + phrase.length;
    }
  }

  return issues;
}
