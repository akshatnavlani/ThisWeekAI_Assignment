import { describe, expect, it } from "vitest";
import { normalizeSectionContent } from "@/lib/draft/normalizeSectionContent";
import { workingPlainFromSections } from "@/lib/types/draft";

describe("normalizeSectionContent", () => {
  it("strips duplicate ## Headline from headline body", () => {
    const cleaned = normalizeSectionContent(
      "headline",
      "## Headline\n\nOpenAI ships quieter evals",
      "Headline",
    );
    expect(cleaned).toBe("OpenAI ships quieter evals");
    const plain = workingPlainFromSections([
      {
        key: "headline",
        title: "Headline",
        content: cleaned,
        sortOrder: 0,
      },
    ]);
    expect(plain).toBe("# OpenAI ships quieter evals");
    expect(plain.includes("## Headline")).toBe(false);
  });

  it("strips leading # from headline", () => {
    expect(normalizeSectionContent("headline", "# Big title")).toBe("Big title");
  });

  it("strips duplicate What happened heading", () => {
    expect(
      normalizeSectionContent(
        "what_happened",
        "## What happened\n\nVendors shipped.",
        "What happened",
      ),
    ).toBe("Vendors shipped.");
  });
});
