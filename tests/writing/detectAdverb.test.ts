import { describe, expect, it } from "vitest";
import { detectAdverb } from "@/lib/writing/detectAdverb";

describe("detectAdverb", () => {
  it("flags weak intensifying adverbs", () => {
    const issues = detectAdverb(
      "The model is clearly better and extremely fast.",
    );
    expect(issues.some((i) => i.passage.toLowerCase() === "clearly")).toBe(
      true,
    );
    expect(issues.some((i) => i.passage.toLowerCase() === "extremely")).toBe(
      true,
    );
  });

  it("respects word boundaries", () => {
    const issues = detectAdverb("Notaclearlyword here.");
    expect(issues.some((i) => i.passage.toLowerCase() === "clearly")).toBe(
      false,
    );
  });
});
