import { describe, expect, it } from "vitest";
import { normalizeUrl, repairHostname } from "@/lib/ingestion/classify";

describe("repairHostname", () => {
  it("repairs www + label + tld without dots", () => {
    expect(repairHostname("wwwforbescom")).toBe("www.forbes.com");
    expect(repairHostname("wwwc4isrnetcom")).toBe("www.c4isrnet.com");
  });

  it("repairs bare label + tld", () => {
    expect(repairHostname("mdwcom")).toBe("mdw.com");
  });

  it("repairs wikipedia OCR hosts", () => {
    expect(repairHostname("enwikipediaorg")).toBe("en.wikipedia.org");
    expect(repairHostname("wikipediaorg")).toBe("en.wikipedia.org");
  });

  it("leaves dotted hosts alone", () => {
    expect(repairHostname("www.gatesnotes.com")).toBe("www.gatesnotes.com");
  });
});

describe("normalizeUrl", () => {
  it("rewrites host when dots were stripped", () => {
    expect(
      normalizeUrl(
        "https://wwwforbescom/sites/bethkindig/2020/01/31/5-soon-t0-be-trends/",
      ),
    ).toBe(
      "https://www.forbes.com/sites/bethkindig/2020/01/31/5-soon-t0-be-trends/",
    );
  });

  it("keeps valid hosts unchanged aside from hash strip", () => {
    expect(
      normalizeUrl(
        "https://www.gatesnotes.com/work/make-ai-work-for-everyone/reader/a-turbulent-ai-era-and-critical-choices-to-make#x",
      ),
    ).toBe(
      "https://www.gatesnotes.com/work/make-ai-work-for-everyone/reader/a-turbulent-ai-era-and-critical-choices-to-make",
    );
  });
});
