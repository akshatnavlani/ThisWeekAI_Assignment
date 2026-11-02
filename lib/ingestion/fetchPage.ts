import {
  FETCH_MAX_BYTES,
  FETCH_MAX_REDIRECTS,
  FETCH_TIMEOUT_MS,
  USER_AGENT,
} from "./constants";
import { assertSafeUrl, SsrfError } from "./ssrf";

export type FetchPageResult = {
  finalUrl: string;
  contentType: string;
  body: string;
};

export class FetchPageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FetchPageError";
  }
}

async function readBodyLimited(
  res: Response,
  maxBytes: number,
): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) {
    const text = await res.text();
    if (new TextEncoder().encode(text).length > maxBytes) {
      throw new FetchPageError("Response body exceeds size limit");
    }
    return text;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new FetchPageError("Response body exceeds size limit");
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(
    Buffer.concat(chunks.map((c) => Buffer.from(c))),
  );
}

export async function safeFetchPage(
  rawUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchPageResult> {
  let current = (await assertSafeUrl(rawUrl)).toString();

  for (let hop = 0; hop <= FETCH_MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetchImpl(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        },
      });
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof SsrfError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new FetchPageError("Request timed out");
      }
      throw new FetchPageError("Network request failed");
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get("location");
      if (!location) {
        throw new FetchPageError("Redirect without Location header");
      }
      const next = new URL(location, current).toString();
      await assertSafeUrl(next);
      current = next;
      continue;
    }

    if (!res.ok) {
      throw new FetchPageError(`HTTP ${res.status}`);
    }

    const contentType = res.headers.get("content-type") ?? "";
    const body = await readBodyLimited(res, FETCH_MAX_BYTES);
    return { finalUrl: current, contentType, body };
  }

  throw new FetchPageError("Too many redirects");
}
