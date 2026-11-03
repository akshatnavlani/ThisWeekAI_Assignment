/**
 * Pull og:image / twitter:image from HTML and resolve against the page URL.
 */
export function extractOgImage(
  html: string,
  pageUrl: string,
): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ];

  let raw: string | null = null;
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]?.trim()) {
      raw = m[1].trim();
      break;
    }
  }
  if (!raw) return null;

  try {
    return new URL(raw, pageUrl).href;
  } catch {
    return null;
  }
}
