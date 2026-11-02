import type { DetectedIssue } from "@/lib/types/writing";
import { splitSentences } from "./sentences";

const IRREGULAR =
  "made|known|shown|given|taken|written|done|seen|found|built|held|kept|left|paid|said|sent|set|told|used";

const PASSIVE_RE = new RegExp(
  `\\b(is|are|was|were|be|been|being)\\s+(?:\\w+ed|${IRREGULAR})\\b`,
  "gi",
);

export function detectPassive(text: string): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  for (const sentence of splitSentences(text)) {
    PASSIVE_RE.lastIndex = 0;
    const match = PASSIVE_RE.exec(sentence.text);
    if (!match || match.index === undefined) continue;
    const localStart = match.index;
    const localEnd = match.index + match[0].length;
    issues.push({
      category: "passive",
      passage: text.slice(
        sentence.startOffset + localStart,
        sentence.startOffset + localEnd,
      ),
      startOffset: sentence.startOffset + localStart,
      endOffset: sentence.startOffset + localEnd,
    });
  }
  return issues;
}
