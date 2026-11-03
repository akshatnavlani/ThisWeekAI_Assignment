import type { DetectedIssue, SuggestionCategory } from "@/lib/types/writing";
import { CATEGORY_PRIORITY } from "@/lib/types/writing";

function overlaps(a: DetectedIssue, b: DetectedIssue): boolean {
  return a.startOffset < b.endOffset && b.startOffset < a.endOffset;
}

/** Greedy non-overlap: complex > jargon > passive > adverb > filler > weasel. */
export function resolveOverlaps(issues: DetectedIssue[]): DetectedIssue[] {
  const sorted = [...issues].sort((a, b) => {
    const pa = CATEGORY_PRIORITY[a.category as SuggestionCategory] ?? 99;
    const pb = CATEGORY_PRIORITY[b.category as SuggestionCategory] ?? 99;
    if (pa !== pb) return pa - pb;
    if (a.startOffset !== b.startOffset) return a.startOffset - b.startOffset;
    return b.endOffset - a.endOffset;
  });

  const kept: DetectedIssue[] = [];
  for (const issue of sorted) {
    if (kept.some((k) => overlaps(k, issue))) continue;
    kept.push(issue);
  }

  return kept.sort((a, b) => a.startOffset - b.startOffset);
}
