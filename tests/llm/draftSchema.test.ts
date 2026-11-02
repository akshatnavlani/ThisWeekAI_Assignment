import { describe, expect, it } from "vitest";
import {
  geminiDraftSchema,
  normalizeDraftSections,
} from "@/lib/llm/schemas/draft";

describe("geminiDraftSchema", () => {
  it("accepts prose sections", () => {
    const result = geminiDraftSchema.safeParse({
      sections: [
        { key: "headline", title: "Headline", content: "H" },
        { key: "what_happened", title: "What happened", content: "W" },
        { key: "context", title: "Context", content: "C" },
        { key: "analysis", title: "Analysis", content: "A" },
        { key: "implication", title: "Implication", content: "I" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects sources key from model payload", () => {
    const result = geminiDraftSchema.safeParse({
      sections: [
        { key: "sources", title: "Sources", content: "nope" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("normalizeDraftSections requires all prose keys", () => {
    const parsed = geminiDraftSchema.parse({
      sections: [{ key: "headline", title: "Headline", content: "H" }],
    });
    const normalized = normalizeDraftSections(parsed);
    expect(normalized.ok).toBe(false);
    if (!normalized.ok) {
      expect(normalized.issues.some((i) => i.includes("what_happened"))).toBe(
        true,
      );
    }
  });
});
