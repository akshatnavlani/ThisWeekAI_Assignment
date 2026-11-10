export type TweetLookupResult = {
  id: string;
  text: string;
  provider: "x" | "linktext";
  authorId?: string;
  authorName?: string;
  authorUsername?: string;
  authorAvatar?: string;
  imageUrls?: string[];
  createdAt?: string;
  likes?: number;
  retweets?: number;
  replies?: number;
  videos?: unknown[];
};

export class XTweetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XTweetError";
  }
}

export function tweetDisplayTitle(tweet: TweetLookupResult): string {
  const username = tweet.authorUsername?.replace(/^@/, "");
  if (username && tweet.authorName) {
    return `@${username} — ${tweet.authorName}`;
  }
  if (username) return `@${username}`;
  if (tweet.authorName) return tweet.authorName;
  return `Tweet ${tweet.id}`;
}
