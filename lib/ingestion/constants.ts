export const FETCH_TIMEOUT_MS = 10_000;
export const FETCH_MAX_BYTES = 1_500_000;
export const FETCH_MAX_REDIRECTS = 3;
export const PASTE_MAX_CHARS = 100_000;
/** Browser-like UA — many CDNs block custom bot strings with HTTP 403. */
export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Public tweet extract fallback (after optional official X API). */
export const LINKTEXT_EXTRACT_URL = "https://linktext.vercel.app/api/extract";
