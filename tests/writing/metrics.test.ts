import { describe, expect, it } from "vitest";
import { computeMetrics } from "@/lib/writing/metrics";

describe("computeMetrics", () => {
  it("counts words and returns explanations", () => {
    const text = "## Headline\n\nHello world. Another sentence here.";
    const metrics = computeMetrics(text);
    expect(metrics.wordCount).toBeGreaterThan(3);
    expect(metrics.averageSentenceLength).toBeGreaterThan(0);
    expect(metrics.readingTimeMinutes).toBeGreaterThanOrEqual(0);
    expect(metrics.readabilityScore).toBeGreaterThanOrEqual(0);
    expect(metrics.explanations.readability).toMatch(/informational/i);
  });

  it("handles empty text", () => {
    const metrics = computeMetrics("");
    expect(metrics.wordCount).toBe(0);
    expect(metrics.averageSentenceLength).toBe(0);
  });
});
