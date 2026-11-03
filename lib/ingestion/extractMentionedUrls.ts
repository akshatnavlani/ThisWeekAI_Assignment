import { normalizeUrl } from "./classify";

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const IMAGE_EXT_RE = /\.(avif|bmp|gif|jpe?g|png|svg|webp)(\?|#|$)/i;

function stripTrailingPunct(raw: string): string {
  return raw.replace(/[.,;:!?)]+$/g, "");
}

function isProbablyImage(url: string): boolean {
  try {
    return IMAGE_EXT_RE.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

/**
 * Find outbound http(s) URLs in source body text, excluding self and image-only links.
 */
export function extractMentionedUrls(
  text: string,
  options?: { excludeUrl?: string | null; limit?: number },
): string[] {
  const exclude = new Set<string>();
  if (options?.excludeUrl) {
    try {
      exclude.add(normalizeUrl(options.excludeUrl));
    } catch {
      // ignore
    }
  }

  const found: string[] = [];
  const seen = new Set<string>();
  const limit = options?.limit ?? 25;
  const matches = text.match(URL_RE) ?? [];

  for (const m of matches) {
    try {
      const normalized = normalizeUrl(stripTrailingPunct(m));
      if (exclude.has(normalized) || seen.has(normalized)) continue;
      if (isProbablyImage(normalized)) continue;
      seen.add(normalized);
      found.push(normalized);
      if (found.length >= limit) break;
    } catch {
      // skip
    }
  }

  return found;
}

export function parseMentionedUrlsFromMeta(
  rawMetaJson: string | null | undefined,
): string[] {
  if (!rawMetaJson) return [];
  try {
    const meta = JSON.parse(rawMetaJson) as { mentionedUrls?: unknown };
    if (!Array.isArray(meta.mentionedUrls)) return [];
    return meta.mentionedUrls.filter(
      (u): u is string => typeof u === "string" && u.startsWith("http"),
    );
  } catch {
    return [];
  }
}
