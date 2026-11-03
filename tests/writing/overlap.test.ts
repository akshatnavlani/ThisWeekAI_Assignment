import { describe, expect, it } from "vitest";
import type { DetectedIssue } from "@/lib/types/writing";
import { resolveOverlaps } from "@/lib/writing/overlap";

describe("resolveOverlaps", () => {
  it("keeps higher priority complexity over filler", () => {
    const issues: DetectedIssue[] = [
      {
        category: "filler",
        passage: "really long",
        startOffset: 0,
        endOffset: 10,
      },
      {
        category: "complex",
        passage: "really long sentence",
        startOffset: 0,
        endOffset: 20,
      },
    ];
    const resolved = resolveOverlaps(issues);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.category).toBe("complex");
  });

  it("keeps non-overlapping issues", () => {
    const issues: DetectedIssue[] = [
      {
        category: "passive",
        passage: "was made",
        startOffset: 0,
        endOffset: 8,
      },
      {
        category: "filler",
        passage: "very",
        startOffset: 20,
        endOffset: 24,
      },
    ];
    expect(resolveOverlaps(issues)).toHaveLength(2);
  });

  it("keeps jargon over passive on overlapping spans", () => {
    const issues: DetectedIssue[] = [
      {
        category: "passive",
        passage: "QTX was shipped",
        startOffset: 0,
        endOffset: 14,
      },
      {
        category: "jargon",
        passage: "QTX",
        startOffset: 0,
        endOffset: 3,
      },
    ];
    const resolved = resolveOverlaps(issues);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.category).toBe("jargon");
  });

  it("keeps adverb over filler when overlapping", () => {
    const issues: DetectedIssue[] = [
      {
        category: "filler",
        passage: "clearly very",
        startOffset: 0,
        endOffset: 12,
      },
      {
        category: "adverb",
        passage: "clearly",
        startOffset: 0,
        endOffset: 7,
      },
    ];
    const resolved = resolveOverlaps(issues);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.category).toBe("adverb");
  });
});
