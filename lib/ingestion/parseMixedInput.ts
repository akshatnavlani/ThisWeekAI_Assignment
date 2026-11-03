import { isTweetUrl, normalizeUrl } from "./classify";

export type MixedParseResult = {
  /** Page / tweet URLs to ingest as separate sources */
  linkUrls: string[];
  /** Remote image URLs (not ingested as text sources) */
  imageUrls: string[];
  /** Leftover prose after URL stripping */
  prose: string;
};

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;

const IMAGE_EXT_RE = /\.(avif|bmp|gif|jpe?g|png|svg|webp)(\?|#|$)/i;

function stripTrailingPunct(raw: string): string {
  return raw.replace(/[.,;:!?)]+$/g, "");
}

function isImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (IMAGE_EXT_RE.test(u.pathname)) return true;
    // common CDN path hints
    if (/\/image(s)?\//i.test(u.pathname) && IMAGE_EXT_RE.test(u.href)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Segregate a mixed paste: tweet/article links, image links, leftover text.
 * Explicit `urlHint` (from a dedicated field) is treated as a primary link if present.
 */
export function parseMixedInput(
  text: string,
  urlHint?: string | null,
): MixedParseResult {
  const linkSet = new Set<string>();
  const imageSet = new Set<string>();

  const addLink = (raw: string) => {
    try {
      const normalized = normalizeUrl(stripTrailingPunct(raw));
      if (isImageUrl(normalized)) {
        imageSet.add(normalized);
      } else {
        linkSet.add(normalized);
      }
    } catch {
      // skip invalid
    }
  };

  if (urlHint?.trim()) {
    addLink(urlHint.trim());
  }

  let prose = text;
  const matches = text.match(URL_RE) ?? [];
  for (const m of matches) {
    const cleaned = stripTrailingPunct(m);
    addLink(cleaned);
    prose = prose.split(m).join(" ");
  }

  prose = prose.replace(/\s+/g, " ").trim();

  // Prefer stable order: tweets first, then other links
  const links = [...linkSet];
  links.sort((a, b) => {
    const ta = isTweetUrl(a) ? 0 : 1;
    const tb = isTweetUrl(b) ? 0 : 1;
    return ta - tb || a.localeCompare(b);
  });

  return {
    linkUrls: links,
    imageUrls: [...imageSet],
    prose,
  };
}

export type MixedIngestPlanItem =
  | {
      type: "link";
      url: string;
      content?: string;
      imageUrl?: string;
    }
  | {
      type: "paste";
      content: string;
      imageUrl?: string;
    };

/**
 * Turn parse result into create-source jobs.
 * Shared prose is attached to each link source; orphan prose becomes its own paste source
 * when there are no links.
 */
export function planMixedIngest(
  parsed: MixedParseResult,
): MixedIngestPlanItem[] {
  const { linkUrls, imageUrls, prose } = parsed;
  const primaryImage = imageUrls[0];

  if (linkUrls.length === 0) {
    if (!prose && !primaryImage) return [];
    return [
      {
        type: "paste",
        content: prose || "(Image-only source — add notes if needed)",
        imageUrl: primaryImage,
      },
    ];
  }

  return linkUrls.map((url, index) => ({
    type: "link" as const,
    url,
    content: prose || undefined,
    imageUrl: index === 0 ? primaryImage : undefined,
  }));
}
