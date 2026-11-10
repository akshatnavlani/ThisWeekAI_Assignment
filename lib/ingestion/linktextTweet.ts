import { z } from "zod";
import { extractTweetId } from "./classify";
import { FETCH_TIMEOUT_MS, LINKTEXT_EXTRACT_URL, USER_AGENT } from "./constants";
import { XTweetError, type TweetLookupResult } from "./tweetLookup";

const linktextAuthorSchema = z.object({
  name: z.string().optional(),
  username: z.string().optional(),
  avatar: z.string().optional(),
});

const linktextDataSchema = z.object({
  text: z.string(),
  author: linktextAuthorSchema.optional(),
  createdAt: z.string().optional(),
  likes: z.number().optional(),
  retweets: z.number().optional(),
  replies: z.number().optional(),
  images: z.array(z.string()).optional(),
  videos: z.array(z.unknown()).optional(),
  url: z.string().optional(),
});

const linktextSuccessSchema = z.object({
  success: z.literal(true),
  data: linktextDataSchema,
});

export function mapLinktextPayload(
  payload: unknown,
  tweetUrl: string,
): TweetLookupResult {
  const parsed = linktextSuccessSchema.safeParse(payload);
  if (!parsed.success) {
    throw new XTweetError("Linktext returned an unexpected payload");
  }

  const text = parsed.data.data.text.trim();
  if (!text) {
    throw new XTweetError("Linktext returned empty tweet text");
  }

  const id =
    extractTweetId(parsed.data.data.url ?? tweetUrl) ??
    extractTweetId(tweetUrl);
  if (!id) {
    throw new XTweetError("Could not parse tweet id from URL");
  }

  const author = parsed.data.data.author;
  const imageUrls = (parsed.data.data.images ?? []).filter((u) =>
    u.trim().startsWith("http"),
  );

  return {
    id,
    text,
    provider: "linktext",
    authorName: author?.name?.trim() || undefined,
    authorUsername: author?.username?.trim() || undefined,
    authorAvatar: author?.avatar?.trim() || undefined,
    imageUrls: imageUrls.length ? imageUrls : undefined,
    createdAt: parsed.data.data.createdAt,
    likes: parsed.data.data.likes,
    retweets: parsed.data.data.retweets,
    replies: parsed.data.data.replies,
    videos: parsed.data.data.videos,
  };
}

export async function fetchTweetViaLinktext(
  tweetUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TweetLookupResult> {
  if (!extractTweetId(tweetUrl)) {
    throw new XTweetError("Could not parse tweet id from URL");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetchImpl(LINKTEXT_EXTRACT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({ url: tweetUrl }),
      signal: controller.signal,
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = text.trim() ? JSON.parse(text) : null;
    } catch {
      throw new XTweetError(`Linktext returned non-JSON (${res.status})`);
    }

    if (!res.ok) {
      const errMsg =
        json &&
        typeof json === "object" &&
        "error" in json &&
        typeof (json as { error: unknown }).error === "string"
          ? (json as { error: string }).error
          : `Linktext HTTP ${res.status}`;
      throw new XTweetError(errMsg);
    }

    return mapLinktextPayload(json, tweetUrl);
  } catch (err) {
    if (err instanceof XTweetError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new XTweetError("Linktext request timed out");
    }
    throw new XTweetError(
      err instanceof Error ? err.message : "Linktext lookup failed",
    );
  } finally {
    clearTimeout(timer);
  }
}
