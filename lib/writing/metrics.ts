import type { WritingMetrics } from "@/lib/types/writing";
import { countWords, splitSentences } from "./sentences";

const WPM = 200;

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const cleaned = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "");
  const groups = cleaned.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

/**
 * Collapse markdown links/images and bare URLs so syllable counts aren't
 * dominated by concatenated URL letters (which clamps Flesch to 0).
 */
export function proseForReadability(text: string): string {
  return text
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/\bhttps?:\/\/[^\s)<]+/gi, " ")
    .replace(/\bwww\.[^\s)<]+/gi, " ")
    .replace(/[ \t]{2,}/g, " ");
}

/** Flesch Reading Ease — informational only. */
export function fleschReadingEase(text: string): number {
  const prose = proseForReadability(text);
  const words = countWords(prose);
  const sentences = Math.max(1, splitSentences(prose).length);
  if (words === 0) return 0;
  const syllables = prose
    .split(/\s+/)
    .filter(Boolean)
    .reduce((sum, w) => sum + countSyllables(w), 0);
  // Avoid divide-by-zero if tokens were all non-alpha (URLs stripped to empty)
  if (syllables === 0) return 0;
  const score =
    206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}

export function computeMetrics(text: string): WritingMetrics {
  const wordCount = countWords(text);
  const sentences = splitSentences(text);
  const sentenceCount = Math.max(1, sentences.length);
  const averageSentenceLength =
    wordCount === 0
      ? 0
      : Math.round((wordCount / sentenceCount) * 10) / 10;
  const readingTimeMinutes =
    wordCount === 0 ? 0 : Math.round((wordCount / WPM) * 10) / 10;
  const readabilityScore = fleschReadingEase(text);

  return {
    wordCount,
    averageSentenceLength,
    readingTimeMinutes,
    readabilityScore,
    explanations: {
      wordCount: "Total words in the working draft (headings included as text).",
      averageSentenceLength:
        "Mean words per sentence. Long averages often signal denser prose — use as a signal, not a target.",
      readingTime: `Approximate silent reading time at ~${WPM} words per minute.`,
      readability:
        "Flesch Reading Ease (0–100). Higher is “easier.” Informational only — do not optimize the score at the cost of nuance.",
    },
  };
}
