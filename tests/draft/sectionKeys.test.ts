import { describe, expect, it } from "vitest";
import {
  articlePlainFromSections,
  DRAFT_SECTION_KEYS,
  DRAFT_SECTION_SORT_ORDER,
  DRAFT_SECTION_TITLES,
  emptySections,
  isDraftSectionKey,
  sectionRangesInWorkingPlain,
  workingPlainFromSections,
} from "@/lib/types/draft";

describe("draft section keys", () => {
  it("exposes starter template keys with titles and sort order", () => {
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

  it("allows freeform section keys", () => {
    expect(isDraftSectionKey("headline")).toBe(true);
    expect(isDraftSectionKey("custom_section")).toBe(true);
    expect(isDraftSectionKey("")).toBe(false);
  });

  it("builds deterministic working_plain with H1 headline", () => {
    const sections = emptySections().map((s) => ({
      ...s,
      content: s.key === "headline" ? "Quiet speed" : `${s.key} body`,
    }));
    const first = workingPlainFromSections(sections);
    const second = workingPlainFromSections([...sections].reverse());
    expect(first).toBe(second);
    expect(first.startsWith("# Quiet speed")).toBe(true);
    expect(first).not.toContain("## Headline");
    expect(first).toContain("## Sources\n\nsources body");
  });

  it("articlePlain omits scaffolding section titles", () => {
    const sections = emptySections().map((s) => ({
      ...s,
      content: s.key === "headline" ? "Quiet speed" : `${s.key} body`,
    }));
    const plain = articlePlainFromSections(sections);
    expect(plain.startsWith("# Quiet speed")).toBe(true);
    expect(plain).not.toContain("## What happened");
    expect(plain).not.toContain("## Context");
    expect(plain).not.toContain("## Analysis");
    expect(plain).toContain("what_happened body");
    expect(plain).toContain("sources body");
  });

  it("sectionRangesInWorkingPlain cover the full plain", () => {
    const sections = emptySections().map((s) => ({
      ...s,
      content: s.key === "headline" ? "Quiet speed" : `${s.key} body`,
    }));
    const plain = workingPlainFromSections(sections);
    const ranges = sectionRangesInWorkingPlain(sections);
    expect(ranges[0]?.start).toBe(0);
    expect(ranges[ranges.length - 1]?.end).toBe(plain.length);
    for (const range of ranges) {
      expect(plain.slice(range.start, range.end).length).toBe(
        range.end - range.start,
      );
    }
  });
});
