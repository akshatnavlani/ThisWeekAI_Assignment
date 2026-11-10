import {
  isTweetUrl,
  resolveKind,
  resolveModality,
  type SourceKind,
  type SourceModality,
  type SourceStatus,
} from "./classify";
import { extractArticle } from "./extractArticle";
import { extractMentionedUrls } from "./extractMentionedUrls";
import { extractOgImage } from "./extractOgImage";
import { FetchPageError, safeFetchPage } from "./fetchPage";
import { SsrfError } from "./ssrf";
import {
  fetchTweetWithFallback,
  tweetDisplayTitle,
  XTweetError,
  type TweetLookupResult,
} from "./xTweet";

export type IngestInput = {
  url?: string | null;
  title?: string | null;
  content?: string | null;
  kind?: SourceKind;
  /** Existing paste to preserve when reingest network path fails */
  existingContent?: string | null;
  /** Preserve uploaded image across reingest when network path fails */
  existingImageUrl?: string | null;
  /** Remote image from mixed paste segregation (overridden by upload path) */
  imageUrlHint?: string | null;
};

function withMentions(
  meta: Record<string, unknown>,
  body: string,
  selfUrl: string | null,
): string {
  const mentionedUrls = extractMentionedUrls(body, { excludeUrl: selfUrl });
  return JSON.stringify({
    ...meta,
    ...(mentionedUrls.length ? { mentionedUrls } : {}),
  });
}

export type IngestResult = {
  kind: SourceKind;
  url: string | null;
  title: string | null;
  content: string;
  modality: SourceModality;
  status: SourceStatus;
  errorMessage: string | null;
  imageUrl: string | null;
  rawMetaJson: string | null;
};

export type IngestDeps = {
  fetchPage?: typeof safeFetchPage;
  fetchTweet?: (
    tweetUrl: string,
    bearerToken?: string,
  ) => Promise<TweetLookupResult>;
  xBearerToken?: string;
};

function trimOrNull(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

export async function ingestSource(
  input: IngestInput,
  deps: IngestDeps = {},
): Promise<IngestResult> {
  const fetchPage = deps.fetchPage ?? safeFetchPage;
  const fetchTweet = deps.fetchTweet ?? fetchTweetWithFallback;
  const url = trimOrNull(input.url ?? undefined);
  const paste = trimOrNull(input.content ?? undefined);
  const existing = trimOrNull(input.existingContent ?? undefined);
  const kind = resolveKind(url, input.kind);
  const titleHint = trimOrNull(input.title ?? undefined);
  const existingImage = trimOrNull(input.existingImageUrl ?? undefined);
  const imageHint = trimOrNull(input.imageUrlHint ?? undefined);
  const resolveImage = (...candidates: Array<string | null | undefined>) => {
    for (const c of candidates) {
      const t = trimOrNull(c ?? undefined);
      if (t) return t;
    }
    return null;
  };

  // Paste-only path — no network
  if (!url && paste) {
    return {
      kind,
      url: null,
      title: titleHint,
      content: paste,
      modality: "paste",
      status: "ready",
      errorMessage: null,
      imageUrl: resolveImage(existingImage, imageHint),
      rawMetaJson: withMentions({}, paste, null),
    };
  }

  if (!url) {
    return {
      kind,
      url: null,
      title: titleHint,
      content: "",
      modality: "paste",
      status: "failed",
      errorMessage: "URL or pasted content is required",
      imageUrl: existingImage,
      rawMetaJson: null,
    };
  }

  // Tweet path — official X (optional) then linktext fallback
  if (kind === "tweet" || isTweetUrl(url)) {
    try {
      const tweet = await fetchTweet(url, deps.xBearerToken);
      const content = paste ? `${tweet.text}\n\n${paste}` : tweet.text;
      const tweetImage = tweet.imageUrls?.[0] ?? null;
      const imageUrl = existingImage?.startsWith("/api/uploads/")
        ? existingImage
        : resolveImage(imageHint, tweetImage, existingImage);
      return {
        kind: "tweet",
        url,
        title: titleHint ?? tweetDisplayTitle(tweet),
        content,
        modality: resolveModality({
          hasUrl: true,
          hasPaste: Boolean(paste),
          usedXApi: true,
        }),
        status: "ready",
        errorMessage: null,
        imageUrl,
        rawMetaJson: withMentions(
          {
            provider: tweet.provider,
            tweetId: tweet.id,
            authorId: tweet.authorId,
            authorName: tweet.authorName,
            authorUsername: tweet.authorUsername,
            authorAvatar: tweet.authorAvatar,
            imageUrls: tweet.imageUrls,
            videos: tweet.videos,
            createdAt: tweet.createdAt,
            likes: tweet.likes,
            retweets: tweet.retweets,
            replies: tweet.replies,
          },
          content,
          url,
        ),
      };
    } catch (err) {
      const message =
        err instanceof XTweetError
          ? err.message
          : "Tweet lookup failed";
      if (paste) {
        return {
          kind: "tweet",
          url,
          title: titleHint,
          content: paste,
          modality: "url_and_paste",
          status: "ready",
          errorMessage: message,
          imageUrl: existingImage,
          rawMetaJson: null,
        };
      }
      return {
        kind: "tweet",
        url,
        title: titleHint,
        content: existing ?? "",
        modality: "url",
        status: existing ? "ready" : "needs_content",
        errorMessage: message,
        imageUrl: existingImage,
        rawMetaJson: null,
      };
    }
  }

  // Article / other URL path
  try {
    const page = await fetchPage(url);
    const extracted = extractArticle(page.body, page.finalUrl);
    if (!extracted?.textContent) {
      throw new FetchPageError("Could not extract article text");
    }

    const content = paste
      ? `${extracted.textContent}\n\n${paste}`
      : extracted.textContent;

    const ogImage = extractOgImage(page.body, page.finalUrl);
    // Upload path wins; then hint from mixed paste; then og:image
    const imageUrl = existingImage?.startsWith("/api/uploads/")
      ? existingImage
      : resolveImage(imageHint, ogImage, existingImage);

    return {
      kind,
      url,
      title: titleHint ?? extracted.title,
      content,
      modality: resolveModality({
        hasUrl: true,
        hasPaste: Boolean(paste),
        usedXApi: false,
      }),
      status: "ready",
      errorMessage: null,
      imageUrl,
      rawMetaJson: withMentions(
        {
          finalUrl: page.finalUrl,
          contentType: page.contentType,
          excerpt: extracted.excerpt,
          ogImageUrl: ogImage,
        },
        content,
        url,
      ),
    };
  } catch (err) {
    const message =
      err instanceof SsrfError || err instanceof FetchPageError
        ? err.message
        : "Fetch failed";

    // SSRF / invalid URL after create attempt: still needs_content, never invent
    if (paste) {
      return {
        kind,
        url,
        title: titleHint,
        content: paste,
        modality: "url_and_paste",
        status: "ready",
        errorMessage: message,
        imageUrl: existingImage,
        rawMetaJson: null,
      };
    }

    return {
      kind,
      url,
      title: titleHint,
      content: existing ?? "",
      modality: "url",
      status: existing ? "ready" : "needs_content",
      errorMessage: message,
      imageUrl: existingImage,
      rawMetaJson: null,
    };
  }
}
