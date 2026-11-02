import { describe, expect, it } from "vitest";
import { detectFiller } from "@/lib/writing/detectFiller";

describe("detectFiller", () => {
  it("finds single-word fillers with boundaries", () => {
    const text = "This is really important for builders.";
    const issues = detectFiller(text);
    expect(issues.some((i) => i.passage.toLowerCase() === "really")).toBe(true);
  });

  it("finds multi-word phrases", () => {
    const text = "We shipped in order to reduce cost.";
    const issues = detectFiller(text);
    expect(issues.some((i) => i.passage.toLowerCase() === "in order to")).toBe(
      true,
    );
  });

  it("does not match inside longer words", () => {
    const text = "The justification was clear.";
    expect(detectFiller(text).every((i) => i.passage !== "just")).toBe(true);
  });
});
