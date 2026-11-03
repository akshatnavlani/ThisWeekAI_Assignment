import { describe, expect, it } from "vitest";
import { computeMetrics, proseForReadability } from "@/lib/writing/metrics";

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
    expect(metrics.readabilityScore).toBe(0);
  });

  it("scores denser prose lower Flesch ease than short sentences", () => {
    const easy = computeMetrics(
      "Cats sit. Dogs run. Birds fly high in bright blue skies today.",
    );
    const hard = computeMetrics(
      "The implementation of sophisticated algorithmic methodologies necessitates comprehensive consideration of innumerable interdependent computational constraints throughout organizational infrastructures.",
    );
    expect(easy.readabilityScore).toBeGreaterThan(hard.readabilityScore);
  });

  it("does not clamp Flesch to 0 because of markdown link URLs", () => {
    const withLinks = `## Sources

Teams shipped quieter models this week. Builders should re-check evals before switching providers.

- [Gates Notes](https://www.gatesnotes.com/work/make-ai-work-for-everyone/reader/a-turbulent-ai-era-and-critical-choices-to-make)
- [Brookings](https://www.brookings.edu/articles/how-artificial-intelligence-is-transforming-the-world/)
`;
    const metrics = computeMetrics(withLinks);
    expect(proseForReadability(withLinks)).not.toMatch(/https?:\/\//i);
    expect(metrics.readabilityScore).toBeGreaterThan(0);
  });
});
