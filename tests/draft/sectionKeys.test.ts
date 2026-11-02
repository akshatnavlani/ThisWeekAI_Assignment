import { describe, expect, it } from "vitest";
import {
  DRAFT_SECTION_KEYS,
  DRAFT_SECTION_SORT_ORDER,
  DRAFT_SECTION_TITLES,
  emptySections,
  isDraftSectionKey,
  workingPlainFromSections,
} from "@/lib/types/draft";

describe("draft section keys", () => {
  it("exposes six stable keys with titles and sort order", () => {
    expect(DRAFT_SECTION_KEYS).toEqual([
      "headline",
      "what_happened",
      "context",
      "analysis",
      "implication",
      "sources",
    ]);
    for (const key of DRAFT_SECTION_KEYS) {
      expect(DRAFT_SECTION_TITLES[key]).toBeTruthy();
      expect(DRAFT_SECTION_SORT_ORDER[key]).toBeGreaterThanOrEqual(0);
    }
  });

  it("validates section keys", () => {
    expect(isDraftSectionKey("headline")).toBe(true);
    expect(isDraftSectionKey("bogus")).toBe(false);
  });

  it("builds deterministic working_plain", () => {
    const sections = emptySections().map((s) => ({
      ...s,
      content: s.key === "headline" ? "Quiet speed" : `${s.key} body`,
    }));
    const first = workingPlainFromSections(sections);
    const second = workingPlainFromSections([...sections].reverse());
    expect(first).toBe(second);
    expect(first.startsWith("## Headline\n\nQuiet speed")).toBe(true);
    expect(first).toContain("## Sources\n\nsources body");
  });
});
