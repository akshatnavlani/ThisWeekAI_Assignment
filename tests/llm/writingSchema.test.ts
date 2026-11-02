import { describe, expect, it } from "vitest";
import { geminiWritingSuggestionsSchema } from "@/lib/llm/schemas/writing";

describe("geminiWritingSuggestionsSchema", () => {
  it("accepts valid batch", () => {
    const result = geminiWritingSuggestionsSchema.safeParse({
      suggestions: [
        { index: 0, explanation: "Too long", rewrite: "Shorter." },
        { index: 1, explanation: "Passive", rewrite: "Active." },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty explanation", () => {
    const result = geminiWritingSuggestionsSchema.safeParse({
      suggestions: [{ index: 0, explanation: "  ", rewrite: "x" }],
    });
    expect(result.success).toBe(false);
  });
});
