export const DRAFT_SECTION_KEYS = [
  "headline",
  "what_happened",
  "context",
  "analysis",
  "implication",
  "sources",
] as const;

export type DraftSectionKey = (typeof DRAFT_SECTION_KEYS)[number];

export const DRAFT_SECTION_TITLES: Record<DraftSectionKey, string> = {
  headline: "Headline",
  what_happened: "What happened",
  context: "Context",
  analysis: "Analysis",
  implication: "Implication",
  sources: "Sources",
};

export const DRAFT_SECTION_SORT_ORDER: Record<DraftSectionKey, number> = {
  headline: 0,
  what_happened: 1,
  context: 2,
  analysis: 3,
  implication: 4,
  sources: 5,
};

export const PROSE_SECTION_KEYS = [
  "headline",
  "what_happened",
  "context",
  "analysis",
  "implication",
] as const satisfies readonly DraftSectionKey[];

export type DraftMode = "starter_draft" | "outline_only" | "manual";

export type DraftSectionDto = {
  key: DraftSectionKey;
  title: string;
  content: string;
  sortOrder: number;
};

export type DraftDto = {
  id: string;
  projectId: string;
  mode: DraftMode;
  selectedAngleId: string | null;
  originalSnapshot: string | null;
  workingPlain: string;
  sections: DraftSectionDto[];
  isAiStarter: boolean;
  updatedAt: string;
};

export function isDraftSectionKey(value: string): value is DraftSectionKey {
  return (DRAFT_SECTION_KEYS as readonly string[]).includes(value);
}

export function isDraftMode(value: string): value is DraftMode {
  return (
    value === "starter_draft" ||
    value === "outline_only" ||
    value === "manual"
  );
}

export function workingPlainFromSections(
  sections: Array<{ title: string; content: string; sortOrder: number }>,
): string {
  return [...sections]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => `## ${s.title}\n\n${s.content.trim()}`)
    .join("\n\n");
}

export function emptySections(): DraftSectionDto[] {
  return DRAFT_SECTION_KEYS.map((key) => ({
    key,
    title: DRAFT_SECTION_TITLES[key],
    content: "",
    sortOrder: DRAFT_SECTION_SORT_ORDER[key],
  }));
}
