/**
 * Map raw ingest errorMessage strings to short user-facing titles.
 */
export function sourceErrorTitle(errorMessage: string | null | undefined): string | null {
  if (!errorMessage?.trim()) return null;
  const msg = errorMessage.trim();

  if (/^HTTP\s+403\b/i.test(msg)) {
    return "Site blocked automated fetch — use Paste recovery";
  }
  if (/^HTTP\s+404\b/i.test(msg)) return "Page not found (HTTP 404)";
  if (/^HTTP\s+429\b/i.test(msg)) return "Rate limited (HTTP 429)";
  if (/^HTTP\s+\d+/i.test(msg)) return `Fetch failed (${msg})`;
  if (/timed?\s*out/i.test(msg) || /timeout/i.test(msg)) {
    return "Request timed out";
  }
  if (/X_BEARER_TOKEN/i.test(msg) || /not configured/i.test(msg)) {
    return "X API not configured";
  }
  if (/Could not extract/i.test(msg)) return "Could not extract article text";
  if (/Could not resolve hostname/i.test(msg)) {
    return "Couldn't find that website — check URL spelling or Paste recovery";
  }
  if (/SSRF|blocked|private|loopback/i.test(msg)) return "URL not allowed";
  if (/Tweet lookup failed/i.test(msg)) return "Tweet lookup failed";
  if (/Fetch failed/i.test(msg)) return "Fetch failed";

  return msg.length > 80 ? `${msg.slice(0, 77)}…` : msg;
}

/** @deprecated Ready sources no longer show a paste-fallback banner in the UI. */
export function sourceUsesPasteFallback(
  status: string,
  errorMessage: string | null | undefined,
): boolean {
  return status === "ready" && Boolean(errorMessage?.trim());
}
