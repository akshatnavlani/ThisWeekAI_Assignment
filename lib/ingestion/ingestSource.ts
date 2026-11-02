import {
  isTweetUrl,
  resolveKind,
  resolveModality,
  type SourceKind,
  type SourceModality,
  type SourceStatus,
} from "./classify";
import { extractArticle } from "./extractArticle";
import { FetchPageError, safeFetchPage } from "./fetchPage";
import { SsrfError } from "./ssrf";
import { fetchTweetByUrl, XTweetError } from "./xTweet";

export type IngestInput = {
  url?: string | null;
  title?: string | null;
  content?: string | null;
  kind?: SourceKind;
  /** Existing paste to preserve when reingest network path fails */
  existingContent?: string | null;
};

export type IngestResult = {
  kind: SourceKind;
  url: string | null;
  title: string | null;
  content: string;
  modality: SourceModality;
  status: SourceStatus;
  errorMessage: string | null;
  rawMetaJson: string | null;
};

export type IngestDeps = {
  fetchPage?: typeof safeFetchPage;
  fetchTweet?: typeof fetchTweetByUrl;
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
  const fetchTweet = deps.fetchTweet ?? fetchTweetByUrl;
  const url = trimOrNull(input.url ?? undefined);
  const paste = trimOrNull(input.content ?? undefined);
  const existing = trimOrNull(input.existingContent ?? undefined);
  const kind = resolveKind(url, input.kind);
  const titleHint = trimOrNull(input.title ?? undefined);

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
      rawMetaJson: null,
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
      rawMetaJson: null,
    };
  }

  // Tweet path
  if (kind === "tweet" || isTweetUrl(url)) {
    try {
      const tweet = await fetchTweet(url, deps.xBearerToken);
      const content = paste ? `${tweet.text}\n\n${paste}` : tweet.text;
      return {
        kind: "tweet",
        url,
        title: titleHint ?? `Tweet ${tweet.id}`,
        content,
        modality: resolveModality({
          hasUrl: true,
          hasPaste: Boolean(paste),
          usedXApi: true,
        }),
        status: "ready",
        errorMessage: null,
        rawMetaJson: JSON.stringify({
          provider: "x",
          tweetId: tweet.id,
          authorId: tweet.authorId,
        }),
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
      rawMetaJson: JSON.stringify({
        finalUrl: page.finalUrl,
        contentType: page.contentType,
        excerpt: extracted.excerpt,
      }),
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
      rawMetaJson: null,
    };
  }
}
