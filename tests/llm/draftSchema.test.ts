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

  it("accepts freeform section keys with unique keys", () => {
    const result = geminiDraftSchema.safeParse({
      sections: [
        { key: "headline", title: "Headline", content: "H" },
        { key: "takeaway", title: "Takeaway", content: "Ship quieter evals." },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const normalized = normalizeDraftSections(result.data);
      expect(normalized.ok).toBe(true);
    }
  });

  it("normalizeDraftSections requires headline", () => {
    const parsed = geminiDraftSchema.parse({
      sections: [{ key: "lede", title: "Lede", content: "Only body" }],
    });
    const normalized = normalizeDraftSections(parsed);
    expect(normalized.ok).toBe(false);
    if (!normalized.ok) {
      expect(normalized.issues.some((i) => i.toLowerCase().includes("headline"))).toBe(
        true,
      );
    }
  });

  it("normalizeDraftSections requires full classic set when classic keys dominate", () => {
    const parsed = geminiDraftSchema.parse({
      sections: [
        { key: "headline", title: "Headline", content: "H" },
        { key: "what_happened", title: "What happened", content: "W" },
        { key: "context", title: "Context", content: "C" },
      ],
    });
    const normalized = normalizeDraftSections(parsed);
    expect(normalized.ok).toBe(false);
    if (!normalized.ok) {
      expect(normalized.issues.some((i) => i.includes("analysis"))).toBe(true);
    }
  });
});
