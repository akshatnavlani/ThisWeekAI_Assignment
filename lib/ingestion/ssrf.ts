import dns from "node:dns/promises";
import net from "node:net";

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

export type ResolveHost = (hostname: string) => Promise<string[]>;

const defaultResolveHost: ResolveHost = async (hostname) => {
  const results = await dns.lookup(hostname, { all: true, verbatim: true });
  return results.map((r) => r.address);
};

/** Exported for unit tests — classify a single IP string. */
export function isBlockedIp(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, "");

  if (net.isIPv4(normalized)) {
    const parts = normalized.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }

  if (net.isIPv6(normalized)) {
    if (normalized === "::1") return true;
    if (normalized === "::") return true;
    // Unique local fc00::/7, link-local fe80::/10
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    if (normalized.startsWith("fe8") || normalized.startsWith("fe9")) return true;
    if (normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
    // IPv4-mapped
    if (normalized.startsWith("::ffff:")) {
      const v4 = normalized.slice("::ffff:".length);
      return isBlockedIp(v4);
    }
    return false;
  }

  return true;
}

export function parseHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new SsrfError("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError("Only http and https URLs are allowed");
  }
  if (!url.hostname) {
    throw new SsrfError("URL hostname is required");
  }
  // Block obvious local hostnames without DNS
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "metadata.google.internal"
  ) {
    throw new SsrfError("Local or metadata hostnames are blocked");
  }
  // Literal IP in hostname
  if (net.isIP(host) && isBlockedIp(host)) {
    throw new SsrfError("Private or link-local IP addresses are blocked");
  }
  return url;
}

export async function assertSafeUrl(
  raw: string,
  resolveHost: ResolveHost = defaultResolveHost,
): Promise<URL> {
  const url = parseHttpUrl(raw);
  const host = url.hostname;

  if (net.isIP(host)) {
    if (isBlockedIp(host)) {
      throw new SsrfError("Private or link-local IP addresses are blocked");
    }
    return url;
  }

  let addresses: string[];
  try {
    addresses = await resolveHost(host);
  } catch {
    throw new SsrfError("Could not resolve hostname");
  }

  if (addresses.length === 0) {
    throw new SsrfError("Could not resolve hostname");
  }

  for (const address of addresses) {
    if (isBlockedIp(address)) {
      throw new SsrfError("Hostname resolves to a blocked address");
    }
  }

  return url;
}
