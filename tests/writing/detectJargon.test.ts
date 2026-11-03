import { describe, expect, it } from "vitest";
import { detectJargon } from "@/lib/writing/detectJargon";

describe("detectJargon", () => {
  it("ignores allowlisted acronyms like API", () => {
    const issues = detectJargon("Teams shipped a new API this week.");
    expect(issues.some((i) => i.passage === "API")).toBe(false);
  });

  it("flags unexplained acronyms", () => {
    const issues = detectJargon("Vendors announced QTX with quieter evals.");
    expect(issues.some((i) => i.passage === "QTX")).toBe(true);
  });

  it("skips acronyms glossed nearby", () => {
    const issues = detectJargon(
      "Vendors announced QTX (Quantum Thing X) with quieter evals.",
    );
    expect(issues.some((i) => i.passage === "QTX")).toBe(false);
  });

  it("flags buzzwords", () => {
    const issues = detectJargon(
      "This paradigm shift unlocks synergy for founders.",
    );
    expect(issues.some((i) => /paradigm shift/i.test(i.passage))).toBe(true);
    expect(issues.some((i) => /synergy/i.test(i.passage))).toBe(true);
  });
});
