import { USER_AGENT } from "./constants";
import { extractTweetId } from "./classify";

export type TweetLookupResult = {
  id: string;
  text: string;
  authorId?: string;
};

export class XTweetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XTweetError";
  }
}

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
    authorId: json.data.author_id,
  };
}
