import { USER_AGENT } from "./constants";
import { extractTweetId } from "./classify";
import { fetchTweetViaLinktext } from "./linktextTweet";
import { XTweetError, type TweetLookupResult } from "./tweetLookup";

export {
  tweetDisplayTitle,
  XTweetError,
  type TweetLookupResult,
} from "./tweetLookup";

export async function fetchTweetByUrl(
  tweetUrl: string,
  bearerToken: string | undefined = process.env.X_BEARER_TOKEN,
  fetchImpl: typeof fetch = fetch,
): Promise<TweetLookupResult> {
  if (!bearerToken?.trim()) {
    throw new XTweetError("X_BEARER_TOKEN is not configured");
  }

  const tweetId = extractTweetId(tweetUrl);
  if (!tweetId) {
    throw new XTweetError("Could not parse tweet id from URL");
  }

  const endpoint = `https://api.x.com/2/tweets/${tweetId}?tweet.fields=text,author_id`;
  const res = await fetchImpl(endpoint, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "User-Agent": USER_AGENT,
    },
  });

  if (!res.ok) {
    throw new XTweetError(`X API HTTP ${res.status}`);
  }

  const json = (await res.json()) as {
    data?: { id: string; text: string; author_id?: string };
  };

  if (!json.data?.text?.trim()) {
    throw new XTweetError("X API returned empty tweet text");
  }

  return {
    id: json.data.id,
    text: json.data.text.trim(),
    provider: "x",
    authorId: json.data.author_id,
  };
}

/**
 * Prefer official X when a bearer token exists; fall back to linktext extract.
 */
export async function fetchTweetWithFallback(
  tweetUrl: string,
  bearerToken: string | undefined = process.env.X_BEARER_TOKEN,
  fetchImpl: typeof fetch = fetch,
): Promise<TweetLookupResult> {
  let lastError: Error | null = null;

  if (bearerToken?.trim()) {
    try {
      return await fetchTweetByUrl(tweetUrl, bearerToken, fetchImpl);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  try {
    return await fetchTweetViaLinktext(tweetUrl, fetchImpl);
  } catch (err) {
    const linktextError =
      err instanceof Error ? err : new Error(String(err));
    if (lastError) {
      throw new XTweetError(
        `${lastError.message}; linktext: ${linktextError.message}`,
      );
    }
    throw linktextError instanceof XTweetError
      ? linktextError
      : new XTweetError(linktextError.message);
  }
}
