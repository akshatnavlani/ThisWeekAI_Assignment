import type { DetectedIssue } from "@/lib/types/writing";
import { countWords, splitSentences } from "./sentences";

export const COMPLEX_WORD_THRESHOLD = 28;
export const COMPLEX_COMMA_THRESHOLD = 3;

export function detectComplex(text: string): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  for (const sentence of splitSentences(text)) {
    const words = countWords(sentence.text);
    const commas = (sentence.text.match(/,/g) ?? []).length;
    if (words >= COMPLEX_WORD_THRESHOLD || commas >= COMPLEX_COMMA_THRESHOLD) {
      issues.push({
        category: "complex",
        passage: sentence.text,
        startOffset: sentence.startOffset,
        endOffset: sentence.endOffset,
      });
    }
  }
  return issues;
}
