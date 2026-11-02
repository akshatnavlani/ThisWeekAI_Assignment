import { describe, expect, it } from "vitest";
import { geminiBriefSchema } from "@/lib/llm/schemas/brief";

const valid = {
  whatHappened: "A model shipped with lower latency.",
  whyItMatters: "Builders can ship product loops faster.",
  facts: [{ text: "Latency dropped 30%.", sourceIds: ["s1"] }],
  analysis: [
    {
      text: "This may pressure incumbents.",
      kind: "analysis" as const,
      sourceIds: ["s1", "s2"],
    },
  ],
  connections: [
    { text: "Pairs with open eval suites.", sourceIds: ["s2"] },
  ],
  angles: [
    {
      title: "Speed without sacrifice",
      description: "Why latency wins for operators this week.",
    },
  ],
};

describe("geminiBriefSchema", () => {
  it("accepts a valid fixture", () => {
    const parsed = geminiBriefSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects empty angles", () => {
    const parsed = geminiBriefSchema.safeParse({ ...valid, angles: [] });
    expect(parsed.success).toBe(false);
  });

  it("rejects bad analysis kind", () => {
    const parsed = geminiBriefSchema.safeParse({
      ...valid,
      analysis: [{ text: "x", kind: "opinion", sourceIds: ["s1"] }],
    });
    expect(parsed.success).toBe(false);
  });
});
