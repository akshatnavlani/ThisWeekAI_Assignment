import { describe, expect, it } from "vitest";
import { extractMentionedUrls } from "@/lib/ingestion/extractMentionedUrls";

describe("extractMentionedUrls", () => {
  it("finds outbound links excluding self and images", () => {
    const body = `
      See https://other.com/story and https://cdn.example.com/pic.png
      also https://self.com/original
    `;
    const urls = extractMentionedUrls(body, {
      excludeUrl: "https://self.com/original",
    });
    expect(urls).toContain("https://other.com/story");
    expect(urls.some((u) => u.includes("pic.png"))).toBe(false);
    expect(urls.some((u) => u.includes("self.com"))).toBe(false);
  });
});
