export const SUGGESTION_CATEGORIES = [
  "complex",
  "jargon",
  "passive",
  "adverb",
  "filler",
  "weasel",
] as const;
export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];

export const SUGGESTION_STATUSES = ["pending", "accepted", "rejected"] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

/** Lower number = higher priority when spans overlap (ADR-018). */
export const CATEGORY_PRIORITY: Record<SuggestionCategory, number> = {
  complex: 0,
  jargon: 1,
  passive: 2,
  adverb: 3,
  filler: 4,
  weasel: 5,
};

export const CATEGORY_HIGHLIGHT_BG: Record<SuggestionCategory, string> = {
  complex: "var(--highlight-complex-bg)",
  jargon: "var(--highlight-jargon-bg)",
  passive: "var(--highlight-passive-bg)",
  adverb: "var(--highlight-adverb-bg)",
  filler: "var(--highlight-filler-bg)",
  weasel: "var(--highlight-weasel-bg)",
};

export const CATEGORY_HIGHLIGHT_FG: Record<SuggestionCategory, string> = {
  complex: "var(--highlight-complex)",
  jargon: "var(--highlight-jargon)",
  passive: "var(--highlight-passive)",
  adverb: "var(--highlight-adverb)",
  filler: "var(--highlight-filler)",
  weasel: "var(--highlight-weasel)",
};

export type DetectedIssue = {
  category: SuggestionCategory;
  passage: string;
  startOffset: number;
  endOffset: number;
};

export type SuggestionDto = {
  id: string;
  draftId: string;
  category: SuggestionCategory;
  passage: string;
  startOffset: number;
  endOffset: number;
  explanation: string;
  rewrite: string;
  status: SuggestionStatus;
  createdAt: string;
};

export type WritingMetrics = {
  wordCount: number;
  averageSentenceLength: number;
  readingTimeMinutes: number;
  readabilityScore: number;
  explanations: {
    wordCount: string;
    averageSentenceLength: string;
    readingTime: string;
    readability: string;
  };
};

export type AnalyzeResult = {
  draftId: string;
  suggestions: SuggestionDto[];
  metrics: WritingMetrics;
};

export function isSuggestionCategory(value: string): value is SuggestionCategory {
  return (SUGGESTION_CATEGORIES as readonly string[]).includes(value);
}

export function isSuggestionStatus(value: string): value is SuggestionStatus {
  return (SUGGESTION_STATUSES as readonly string[]).includes(value);
}
