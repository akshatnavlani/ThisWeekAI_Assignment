import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LINKTEXT_EXTRACT_URL } from "@/lib/ingestion/constants";
import {
  fetchTweetViaLinktext,
  mapLinktextPayload,
} from "@/lib/ingestion/linktextTweet";
import { fetchTweetWithFallback, XTweetError } from "@/lib/ingestion/xTweet";

function loadFixture(name: string): unknown {
  const file = path.join(__dirname, "fixtures", name);
  return JSON.parse(readFileSync(file, "utf8")) as unknown;
}

describe("mapLinktextPayload", () => {
  it("maps text-only tweet fixture", () => {
    const mapped = mapLinktextPayload(
      loadFixture("linktext-musk.json"),
      "https://x.com/elonmusk/status/1519480761749016577",
    );
    expect(mapped.provider).toBe("linktext");
    expect(mapped.id).toBe("1519480761749016577");
    expect(mapped.text).toContain("Coca-Cola");
    expect(mapped.authorUsername).toBe("elonmusk");
    expect(mapped.authorName).toBe("Elon Musk");
    expect(mapped.imageUrls).toBeUndefined();
  });

  it("maps media tweet fixture including image URLs", () => {
    const mapped = mapLinktextPayload(
      loadFixture("linktext-obama-media.json"),
      "https://x.com/BarackObama/status/266031293945503744",
    );
    expect(mapped.id).toBe("266031293945503744");
    expect(mapped.authorUsername).toBe("BarackObama");
    expect(mapped.imageUrls?.[0]).toContain("pbs.twimg.com/media");
    expect(mapped.likes).toBe(454553);
  });

  it("rejects empty text", () => {
    expect(() =>
      mapLinktextPayload(
        { success: true, data: { text: "   ", images: [] } },
        "https://x.com/user/status/1234567890123456789",
      ),
    ).toThrow(XTweetError);
  });

  it("rejects unexpected payloads", () => {
    expect(() =>
      mapLinktextPayload(
        { success: false },
        "https://x.com/user/status/1234567890123456789",
      ),
    ).toThrow(/unexpected payload/i);
  });
});

describe("fetchTweetViaLinktext", () => {
  it("POSTs to linktext and maps JSON", async () => {
    const fixture = loadFixture("linktext-obama-media.json");
    const tweet = await fetchTweetViaLinktext(
      "https://x.com/BarackObama/status/266031293945503744",
      async (input, init) => {
        expect(String(input)).toBe(LINKTEXT_EXTRACT_URL);
        expect(init?.method).toBe("POST");
        const body = JSON.parse(String(init?.body)) as { url: string };
        expect(body.url).toContain("BarackObama");
        return new Response(JSON.stringify(fixture), { status: 200 });
      },
    );
    expect(tweet.provider).toBe("linktext");
    expect(tweet.imageUrls?.[0]).toContain("pbs.twimg.com");
  });

  it("surfaces linktext HTTP errors", async () => {
    await expect(
      fetchTweetViaLinktext(
        "https://x.com/user/status/1234567890123456789",
        async () =>
          new Response(
            JSON.stringify({ error: "Invalid X/Twitter URL. Please use a format like: https://x.com/user/status/123456" }),
            { status: 400 },
          ),
      ),
    ).rejects.toThrow(/Invalid X\/Twitter URL/i);
  });
});

describe("fetchTweetWithFallback", () => {
  it("uses linktext when bearer is missing", async () => {
    const fixture = loadFixture("linktext-musk.json");
    const tweet = await fetchTweetWithFallback(
      "https://x.com/elonmusk/status/1519480761749016577",
      undefined,
      async () => new Response(JSON.stringify(fixture), { status: 200 }),
    );
    expect(tweet.provider).toBe("linktext");
    expect(tweet.authorUsername).toBe("elonmusk");
  });

  it("falls back to linktext after official X fails", async () => {
    const fixture = loadFixture("linktext-musk.json");
    let calls = 0;
    const tweet = await fetchTweetWithFallback(
      "https://x.com/elonmusk/status/1519480761749016577",
      "fake-bearer",
      async (input) => {
        calls += 1;
        if (String(input).includes("api.x.com")) {
          return new Response("nope", { status: 401 });
        }
        return new Response(JSON.stringify(fixture), { status: 200 });
      },
    );
    expect(calls).toBe(2);
    expect(tweet.provider).toBe("linktext");
  });
});

describe.runIf(process.env.LINKTEXT_LIVE === "1")(
  "linktext live smoke",
  () => {
    it("extracts a public tweet", async () => {
      const tweet = await fetchTweetViaLinktext(
        "https://x.com/elonmusk/status/1519480761749016577",
      );
      expect(tweet.text.length).toBeGreaterThan(0);
      expect(tweet.provider).toBe("linktext");
    }, 30_000);
  },
);
