import { describe, expect, it } from "vitest";
import { FetchPageError } from "@/lib/ingestion/fetchPage";
import { ingestSource } from "@/lib/ingestion/ingestSource";

const SAMPLE_HTML = `<!doctype html><html><head>
<title>Sample AI Story</title>
<meta property="og:image" content="https://cdn.example.com/story.jpg" />
</head>
<body><article><h1>Sample AI Story</h1><p>Founders shipped a quieter model this week with clearer evals.</p>
<p>Builders care because latency dropped without losing accuracy on their suite.</p></article></body></html>`;

describe("ingestSource", () => {
  it("marks paste-only sources ready without network", async () => {
    const result = await ingestSource({
      content: "Paste-only body about an AI product launch.",
      title: "Paste note",
    });
    expect(result.status).toBe("ready");
    expect(result.modality).toBe("paste");
    expect(result.content).toContain("Paste-only body");
    expect(result.url).toBeNull();
  });

  it("extracts article HTML via mocked fetch to ready", async () => {
    const result = await ingestSource(
      { url: "https://example.com/ai-story" },
      {
        fetchPage: async () => ({
          finalUrl: "https://example.com/ai-story",
          contentType: "text/html",
          body: SAMPLE_HTML,
        }),
      },
    );
    expect(result.status).toBe("ready");
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content.toLowerCase()).not.toContain("lorem ipsum invented");
    expect(result.modality).toBe("url");
    expect(result.imageUrl).toBe("https://cdn.example.com/story.jpg");
  });

  it("appends paste after successful extract", async () => {
    const result = await ingestSource(
      {
        url: "https://example.com/ai-story",
        content: "Editor note pasted here.",
      },
      {
        fetchPage: async () => ({
          finalUrl: "https://example.com/ai-story",
          contentType: "text/html",
          body: SAMPLE_HTML,
        }),
      },
    );
    expect(result.status).toBe("ready");
    expect(result.modality).toBe("url_and_paste");
    expect(result.content).toContain("Founders shipped");
    expect(result.content).toContain("Editor note pasted here.");
    expect(result.content.indexOf("Founders")).toBeLessThan(
      result.content.indexOf("Editor note"),
    );
  });

  it("sets needs_content with empty body on fetch failure — never invents text", async () => {
    const result = await ingestSource(
      { url: "https://example.com/paywall" },
      {
        fetchPage: async () => {
          throw new FetchPageError("HTTP 403");
        },
      },
    );
    expect(result.status).toBe("needs_content");
    expect(result.content).toBe("");
    expect(result.errorMessage).toBe("HTTP 403");
  });

  it("keeps paste and errorMessage when fetch fails with paste", async () => {
    const result = await ingestSource(
      {
        url: "https://example.com/paywall",
        content: "Recovered paste body",
      },
      {
        fetchPage: async () => {
          throw new FetchPageError("HTTP 403");
        },
      },
    );
    expect(result.status).toBe("ready");
    expect(result.content).toBe("Recovered paste body");
    expect(result.errorMessage).toBe("HTTP 403");
    expect(result.modality).toBe("url_and_paste");
  });

  it("uses paste when tweet X lookup fails", async () => {
    const result = await ingestSource(
      {
        url: "https://x.com/user/status/1234567890123456789",
        content: "Manual tweet paste body",
        kind: "tweet",
      },
      {
        fetchTweet: async () => {
          throw new Error("no token");
        },
      },
    );
    expect(result.status).toBe("ready");
    expect(result.content).toBe("Manual tweet paste body");
  });
});
