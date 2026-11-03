import { describe, expect, it } from "vitest";
import { detectWeasel } from "@/lib/writing/detectWeasel";

describe("detectWeasel", () => {
  it("flags hedge phrases", () => {
    const issues = detectWeasel(
      "Apparently the release slipped, and it seems that latency rose.",
    );
    expect(issues.some((i) => /apparently/i.test(i.passage))).toBe(true);
    expect(issues.some((i) => /it seems that/i.test(i.passage))).toBe(true);
  });
});
