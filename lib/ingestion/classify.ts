export type SourceKind = "article" | "tweet" | "other";
export type SourceModality = "url" | "paste" | "url_and_paste" | "x_api";
export type SourceStatus =
  | "pending"
  | "ready"
  | "needs_content"
  | "failed";

export function isTweetUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "twitter.com" ||
      host === "www.twitter.com" ||
      host === "x.com" ||
      host === "www.x.com" ||
      host === "mobile.twitter.com"
    );
  } catch {
    return false;
  }
}

export function extractTweetId(url: string): string | null {
  try {
    const u = new URL(url);
    const match = u.pathname.match(/\/status\/(\d+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function resolveKind(
  url: string | null | undefined,
  kindHint?: SourceKind,
): SourceKind {
  if (kindHint) return kindHint;
  if (url && isTweetUrl(url)) return "tweet";
  if (url) return "article";
  return "other";
}

export function resolveModality(input: {
  hasUrl: boolean;
  hasPaste: boolean;
  usedXApi: boolean;
}): SourceModality {
  if (input.usedXApi) return "x_api";
  if (input.hasUrl && input.hasPaste) return "url_and_paste";
  if (input.hasPaste) return "paste";
  return "url";
}

/**
 * Repair hostnames that lost dots in paste/OCR (e.g. wwwforbescom → www.forbes.com).
 * Leaves already-dotted hosts and IPs unchanged.
 */
export function repairHostname(hostname: string): string {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host || host.includes(".") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return host;
  }

  // Common encyclopedia OCR: enwikipediaorg / wikipediaorg
  if (/^(en)?wikipediaorg$/.test(host)) {
    return "en.wikipedia.org";
  }

  const wwwTld = host.match(
    /^(www)([a-z0-9-]+)(com|org|net|edu|io|co|ai|info|gov|uk)$/i,
  );
  if (wwwTld) {
    return `${wwwTld[1]}.${wwwTld[2]}.${wwwTld[3]}`.toLowerCase();
  }

  const bareTld = host.match(
    /^([a-z0-9-]+)(com|org|net|edu|io|co|ai|info|gov)$/i,
  );
  if (bareTld) {
    return `${bareTld[1]}.${bareTld[2]}`.toLowerCase();
  }

  return host;
}

export function normalizeUrl(raw: string): string {
  const u = new URL(raw.trim());
  u.hash = "";
  const repaired = repairHostname(u.hostname);
  if (repaired && repaired !== u.hostname.toLowerCase()) {
    u.hostname = repaired;
  }
  return u.toString();
}
