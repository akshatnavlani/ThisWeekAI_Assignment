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

  it("maps linktext-style tweet lookup to ready source with author + image", async () => {
    const result = await ingestSource(
      {
        url: "https://x.com/BarackObama/status/266031293945503744",
        kind: "tweet",
      },
      {
        fetchTweet: async () => ({
          id: "266031293945503744",
          text: "Four more years. http://t.co/bAJE6Vom",
          provider: "linktext",
          authorName: "Barack Obama",
          authorUsername: "BarackObama",
          authorAvatar:
            "https://pbs.twimg.com/profile_images/1329647526807543809/2SGvnHYV_200x200.jpg",
          imageUrls: [
            "https://pbs.twimg.com/media/A7EiDWcCYAAZT1D.jpg?name=orig",
          ],
          likes: 454553,
        }),
      },
    );
    expect(result.status).toBe("ready");
    expect(result.kind).toBe("tweet");
    expect(result.modality).toBe("x_api");
    expect(result.title).toBe("@BarackObama — Barack Obama");
    expect(result.content).toContain("Four more years");
    expect(result.imageUrl).toContain("pbs.twimg.com/media");
    const meta = JSON.parse(result.rawMetaJson!) as {
      provider: string;
      mentionedUrls?: string[];
      authorUsername?: string;
    };
    expect(meta.provider).toBe("linktext");
    expect(meta.authorUsername).toBe("BarackObama");
    expect(meta.mentionedUrls?.[0]).toContain("http://t.co/bAJE6Vom");
  });

  it("prefers mixed image hint over tweet media", async () => {
    const result = await ingestSource(
      {
        url: "https://x.com/user/status/1234567890123456789",
        kind: "tweet",
        imageUrlHint: "https://cdn.example.com/from-paste.png",
      },
      {
        fetchTweet: async () => ({
          id: "1234567890123456789",
          text: "Hello",
          provider: "linktext",
          authorUsername: "user",
          imageUrls: ["https://pbs.twimg.com/media/tweet.jpg"],
        }),
      },
    );
    expect(result.imageUrl).toBe("https://cdn.example.com/from-paste.png");
  });

  it("prefers uploaded image over tweet media", async () => {
    const result = await ingestSource(
      {
        url: "https://x.com/user/status/1234567890123456789",
        kind: "tweet",
        existingImageUrl: "/api/uploads/proj/photo.jpg",
        imageUrlHint: "https://cdn.example.com/hint.png",
      },
      {
        fetchTweet: async () => ({
          id: "1234567890123456789",
          text: "Hello",
          provider: "linktext",
          imageUrls: ["https://pbs.twimg.com/media/tweet.jpg"],
        }),
      },
    );
    expect(result.imageUrl).toBe("/api/uploads/proj/photo.jpg");
  });
});
