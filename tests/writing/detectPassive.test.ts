import { describe, expect, it } from "vitest";
import { detectPassive } from "@/lib/writing/detectPassive";

describe("detectPassive", () => {
  it("detects be + past participle", () => {
    const text = "The model was trained on public data.";
    const issues = detectPassive(text);
    expect(issues.length).toBe(1);
    expect(issues[0]?.category).toBe("passive");
    expect(issues[0]?.passage.toLowerCase()).toContain("was trained");
  });

  it("detects irregular passives", () => {
    const text = "Results were made available yesterday.";
    expect(detectPassive(text).length).toBeGreaterThanOrEqual(1);
  });

  it("ignores active voice", () => {
    const text = "Engineers trained the model on public data.";
    expect(detectPassive(text)).toHaveLength(0);
  });
});
