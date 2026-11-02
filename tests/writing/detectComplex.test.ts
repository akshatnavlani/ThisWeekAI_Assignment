import { describe, expect, it } from "vitest";
import { detectComplex } from "@/lib/writing/detectComplex";

describe("detectComplex", () => {
  it("flags long sentences by word count", () => {
    const words = Array.from({ length: 30 }, (_, i) => `word${i}`).join(" ");
    const text = `## Headline\n\n${words}.`;
    const issues = detectComplex(text);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0]?.category).toBe("complex");
  });

  it("flags sentences with many commas", () => {
    const text = "One, two, three, four, and five are listed.";
    const issues = detectComplex(text);
    expect(issues.some((i) => i.category === "complex")).toBe(true);
  });

  it("skips short simple sentences", () => {
    const text = "## Headline\n\nShort line here.";
    expect(detectComplex(text)).toHaveLength(0);
  });
});
