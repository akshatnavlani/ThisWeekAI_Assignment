import { describe, expect, it } from "vitest";
import { extractOgImage } from "@/lib/ingestion/extractOgImage";

describe("extractOgImage", () => {
  it("extracts absolute og:image", () => {
    const html = `<html><head>
      <meta property="og:image" content="https://cdn.example.com/a.jpg" />
    </head></html>`;
    expect(extractOgImage(html, "https://example.com/post")).toBe(
      "https://cdn.example.com/a.jpg",
    );
  });

  it("resolves relative twitter:image", () => {
    const html = `<meta name="twitter:image" content="/img/hero.png">`;
    expect(extractOgImage(html, "https://example.com/a/b")).toBe(
      "https://example.com/img/hero.png",
    );
  });

  it("returns null when missing", () => {
    expect(extractOgImage("<html></html>", "https://example.com")).toBeNull();
  });
});
