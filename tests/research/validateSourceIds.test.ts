import { describe, expect, it } from "vitest";
import type { GeminiBrief } from "@/lib/llm/schemas/brief";
import { sanitizeBriefSourceIds } from "@/lib/research/validateSourceIds";

const brief: GeminiBrief = {
  whatHappened: "Event",
  whyItMatters: "Why",
  facts: [
    { text: "Fact A", sourceIds: ["a", "ghost"] },
    { text: "Fact B", sourceIds: ["ghost"] },
  ],
  analysis: [
    { text: "Analysis", kind: "analysis", sourceIds: ["b"] },
  ],
  connections: [{ text: "Link", sourceIds: ["a", "b"] }],
  angles: [{ title: "Angle", description: "Desc" }],
};

describe("sanitizeBriefSourceIds", () => {
  it("drops unknown ids and flags items left empty", () => {
    const result = sanitizeBriefSourceIds(brief, ["a", "b"]);
    expect(result.brief.facts[0]?.sourceIds).toEqual(["a"]);
    expect(result.brief.facts[1]?.sourceIds).toEqual([]);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.includes("facts[1]"))).toBe(true);
  });

  it("passes when all items keep at least one id", () => {
    const result = sanitizeBriefSourceIds(
      {
        ...brief,
        facts: [{ text: "Fact A", sourceIds: ["a"] }],
      },
      ["a", "b"],
    );
    expect(result.ok).toBe(true);
  });
});
