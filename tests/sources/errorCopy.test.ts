import { describe, expect, it } from "vitest";
import { sourceErrorTitle } from "@/lib/sources/errorCopy";

describe("sourceErrorTitle", () => {
  it("points 403 at paste recovery", () => {
    expect(sourceErrorTitle("HTTP 403")).toMatch(/Paste recovery/i);
  });

  it("points hostname failures at spelling or paste", () => {
    expect(sourceErrorTitle("Could not resolve hostname")).toMatch(
      /check URL spelling/i,
    );
  });
});
