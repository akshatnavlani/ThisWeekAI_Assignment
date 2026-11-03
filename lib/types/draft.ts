/** Suggested starter section keys (not a DB enum — freeform keys allowed). */
export const STARTER_SECTION_KEYS = [
  "headline",
  "what_happened",
  "context",
  "analysis",
  "implication",
  "sources",
] as const;

export type StarterSectionKey = (typeof STARTER_SECTION_KEYS)[number];

export const STARTER_SECTION_TITLES: Record<StarterSectionKey, string> = {
  headline: "Headline",
  what_happened: "What happened",
  context: "Context",
  analysis: "Analysis",
  implication: "Implication",
  sources: "Sources",
};

export const STARTER_SECTION_PURPOSES: Record<StarterSectionKey, string> = {
  headline: "Article title",
  what_happened: "Lead facts and news",
  context: "Background for the reader",
  analysis: "Interpretation grounded in sources",
  implication: "So-what for founders and builders",
  sources: "Citation list",
};

/** @deprecated Use string section keys; kept for test/compat aliases */
export const DRAFT_SECTION_KEYS = STARTER_SECTION_KEYS;
export type DraftSectionKey = string;
export const DRAFT_SECTION_TITLES = STARTER_SECTION_TITLES as Record<
  string,
  string
>;
export const DRAFT_SECTION_SORT_ORDER: Record<string, number> = {
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
] as const;

export type DraftMode = "starter_draft" | "blank";

export type DraftSectionDto = {
  key: string;
  title: string;
  purpose: string;
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
  /** True when Change angle cleared body — show Blank/Starter picker */
  awaitingStart: boolean;
  updatedAt: string;
};

export function normalizeDraftMode(value: string): DraftMode {
  if (value === "starter_draft") return "starter_draft";
  return "blank";
}

export function isDraftMode(value: string): value is DraftMode {
  return value === "starter_draft" || value === "blank";
}

export function isHeadlineSection(section: {
  key: string;
  title: string;
}): boolean {
  return (
    section.key === "headline" ||
    section.title.trim().toLowerCase() === "headline"
  );
}

export function slugifySectionKey(title: string): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "section";
  return base.slice(0, 48);
}

export function workingPlainFromSections(
  sections: Array<{
    key: string;
    title: string;
    content: string;
    sortOrder: number;
  }>,
): string {
  return [...sections]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => {
      const body = s.content.trim();
      if (isHeadlineSection(s)) {
        return body ? `# ${body}` : "#";
      }
      return `## ${s.title}\n\n${body}`;
    })
    .join("\n\n");
}

export type SectionPlainRange = {
  key: string;
  start: number;
  end: number;
};

/** Byte/char offsets of each section block inside `workingPlainFromSections` output. */
export function sectionRangesInWorkingPlain(
  sections: Array<{
    key: string;
    title: string;
    content: string;
    sortOrder: number;
  }>,
): SectionPlainRange[] {
  const ordered = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
  const ranges: SectionPlainRange[] = [];
  let cursor = 0;
  ordered.forEach((s, index) => {
    const body = s.content.trim();
    const block = isHeadlineSection(s)
      ? body
        ? `# ${body}`
        : "#"
      : `## ${s.title}\n\n${body}`;
    const start = cursor;
    const end = start + block.length;
    ranges.push({ key: s.key, start, end });
    cursor = end;
    if (index < ordered.length - 1) cursor += 2; // "\n\n" joiner
  });
  return ranges;
}

/** Article-shaped markdown for MD preview / export (no scaffolding section titles). */
export function articlePlainFromSections(
  sections: Array<{
    key: string;
    title: string;
    content: string;
    sortOrder: number;
  }>,
): string {
  return [...sections]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => {
      const body = s.content.trim();
      if (isHeadlineSection(s)) {
        return body ? `# ${body}` : "";
      }
      return body;
    })
    .filter((block) => block.length > 0)
    .join("\n\n");
}

export function emptyHeadlineSection(): DraftSectionDto {
  return {
    key: "headline",
    title: STARTER_SECTION_TITLES.headline,
    purpose: STARTER_SECTION_PURPOSES.headline,
    content: "",
    sortOrder: 0,
  };
}

/** @deprecated Prefer emptyHeadlineSection for blank drafts */
export function emptySections(): DraftSectionDto[] {
  return STARTER_SECTION_KEYS.map((key, index) => ({
    key,
    title: STARTER_SECTION_TITLES[key],
    purpose: STARTER_SECTION_PURPOSES[key],
    content: "",
    sortOrder: index,
  }));
}

export function isDraftSectionKey(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
