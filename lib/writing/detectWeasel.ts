import type { DetectedIssue } from "@/lib/types/writing";

/** Longer phrases first. Soft hedges — avoid flagging legitimate “critics argue”. */
export const WEASEL_PHRASES = [
  "it appears that",
  "it seems that",
  "it would seem",
  "some people say",
  "it appears",
  "it seems",
  "apparently",
  "reportedly",
  "seemingly",
  "purportedly",
  "allegedly",
] as const;

export function detectWeasel(text: string): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const lower = text.toLowerCase();

  for (const phrase of WEASEL_PHRASES) {
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
          category: "weasel",
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
