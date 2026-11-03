import { describe, expect, it } from "vitest";
import { buildSourcesSectionContent } from "@/lib/draft/buildSourcesSection";
import type { SourceDto } from "@/lib/types/source";

function source(partial: Partial<SourceDto> & { id: string }): SourceDto {
  return {
    projectId: "p1",
    kind: "article",
    url: null,
    title: null,
    content: "",
    modality: "paste",
    status: "ready",
    errorMessage: null,
    imageUrl: null,
    rawMetaJson: null,
    createdAt: "t",
    updatedAt: "t",
    ...partial,
  };
}

describe("buildSourcesSectionContent", () => {
  it("formats ready sources as markdown links when URL present", () => {
    const content = buildSourcesSectionContent([
      source({
        id: "s1",
        title: "Alpha",
        url: "https://example.com/a",
        status: "ready",
      }),
      source({
        id: "s2",
        title: "Beta paste",
        url: null,
        content: "body",
        status: "ready",
      }),
      source({
        id: "s3",
        title: "Failed",
        status: "failed",
      }),
    ]);

    expect(content).toContain("- [Alpha](https://example.com/a)");
    expect(content).toContain("- Beta paste");
    expect(content).not.toContain("Failed");
  });

  it("returns placeholder when no usable sources", () => {
    expect(buildSourcesSectionContent([])).toBe(
      "_No ready sources available._",
    );
  });
});
