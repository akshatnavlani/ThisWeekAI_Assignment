import { describe, expect, it } from "vitest";
import {
  parseMixedInput,
  planMixedIngest,
} from "@/lib/ingestion/parseMixedInput";

describe("parseMixedInput", () => {
  it("splits tweet, article, image URL, and prose", () => {
    const text = [
      "Latency notes from the launch.",
      "Tweet https://x.com/user/status/1234567890123456789",
      "Article https://example.com/ai-story",
      "Shot https://cdn.example.com/hero.png",
    ].join(" ");

    const parsed = parseMixedInput(text);
    expect(parsed.linkUrls.some((u) => u.includes("x.com"))).toBe(true);
    expect(parsed.linkUrls.some((u) => u.includes("example.com/ai-story"))).toBe(
      true,
    );
    expect(parsed.imageUrls[0]).toContain("hero.png");
    expect(parsed.prose.toLowerCase()).toContain("latency");
    expect(parsed.prose).not.toContain("https://");
  });

  it("plans one source per link with shared prose and image on first", () => {
    const plan = planMixedIngest(
      parseMixedInput(
        "Note https://example.com/a https://cdn.example.com/x.jpg",
      ),
    );
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({
      type: "link",
      url: expect.stringContaining("example.com/a"),
      content: "Note",
      imageUrl: expect.stringContaining("x.jpg"),
    });
  });

  it("plans paste-only when no links", () => {
    const plan = planMixedIngest(parseMixedInput("Just editor notes."));
    expect(plan).toEqual([
      { type: "paste", content: "Just editor notes.", imageUrl: undefined },
    ]);
  });
});
