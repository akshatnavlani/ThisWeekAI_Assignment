/**
 * Human label for a source card — never use the raw URL as the headline.
 */
export function displaySourceTitle(source: {
  title?: string | null;
  url?: string | null;
  content?: string | null;
}): string {
  const titled = source.title?.trim();
  if (titled) return titled;

  const firstLine = source.content
    ?.trim()
    .split(/\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (
    firstLine &&
    firstLine.length <= 120 &&
    !/^https?:\/\//i.test(firstLine)
  ) {
    return firstLine;
  }

  if (source.url?.trim()) {
    try {
      const u = new URL(source.url.trim());
      const slug = u.pathname
        .split("/")
        .filter(Boolean)
        .pop()
        ?.replace(/[-_]+/g, " ")
        .trim();
      if (slug && slug.length > 2) {
        return slug.replace(/\b\w/g, (c) => c.toUpperCase());
      }
      return u.hostname.replace(/^www\./i, "");
    } catch {
      // fall through
    }
  }

  return "Untitled source";
}

export function contentPreview(
  content: string | null | undefined,
  maxLen = 160,
): string | null {
  const trimmed = content?.trim();
  if (!trimmed) return null;
  const flat = trimmed.replace(/\s+/g, " ");
  if (flat.length <= maxLen) return flat;
  return `${flat.slice(0, maxLen - 1)}…`;
}
