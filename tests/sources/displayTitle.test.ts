import { describe, expect, it } from "vitest";
import {
  contentPreview,
  displaySourceTitle,
} from "@/lib/sources/displayTitle";

describe("displaySourceTitle", () => {
  it("prefers explicit title", () => {
    expect(
      displaySourceTitle({
        title: "Gates on AI",
        url: "https://www.gatesnotes.com/x",
        content: "Body",
      }),
    ).toBe("Gates on AI");
  });

  it("uses first content line when title missing", () => {
    expect(
      displaySourceTitle({
        title: null,
        url: "https://www.gatesnotes.com/work/make-ai-work-for-everyone/reader/a-turbulent-ai-era-and-critical-choices-to-make",
        content: "A turbulent AI era\n\nMore body text here.",
      }),
    ).toBe("A turbulent AI era");
  });

  it("falls back to path slug instead of raw URL", () => {
    expect(
      displaySourceTitle({
        title: null,
        url: "https://www.gatesnotes.com/work/make-ai-work-for-everyone/reader/a-turbulent-ai-era-and-critical-choices-to-make",
        content: "",
      }),
    ).toBe("A Turbulent Ai Era And Critical Choices To Make");
  });
});

describe("contentPreview", () => {
  it("returns null for empty", () => {
    expect(contentPreview("")).toBeNull();
  });

  it("truncates long text", () => {
    const preview = contentPreview("word ".repeat(80), 40);
    expect(preview?.endsWith("…")).toBe(true);
    expect((preview?.length ?? 0) <= 40).toBe(true);
  });
});
