import { describe, expect, it } from "vitest";
import {
  assertSafeUrl,
  isBlockedIp,
  parseHttpUrl,
  SsrfError,
} from "@/lib/ingestion/ssrf";

describe("isBlockedIp", () => {
  it("blocks private and loopback IPv4", () => {
    expect(isBlockedIp("127.0.0.1")).toBe(true);
    expect(isBlockedIp("10.0.0.5")).toBe(true);
    expect(isBlockedIp("192.168.1.1")).toBe(true);
    expect(isBlockedIp("172.16.0.1")).toBe(true);
    expect(isBlockedIp("169.254.169.254")).toBe(true);
  });

  it("allows public IPv4", () => {
    expect(isBlockedIp("8.8.8.8")).toBe(false);
    expect(isBlockedIp("1.1.1.1")).toBe(false);
  });

  it("blocks loopback and ULA IPv6", () => {
    expect(isBlockedIp("::1")).toBe(true);
    expect(isBlockedIp("fc00::1")).toBe(true);
    expect(isBlockedIp("fe80::1")).toBe(true);
  });
});

describe("parseHttpUrl", () => {
  it("rejects non-http schemes", () => {
    expect(() => parseHttpUrl("file:///etc/passwd")).toThrow(SsrfError);
    expect(() => parseHttpUrl("ftp://example.com")).toThrow(SsrfError);
  });

  it("rejects localhost hostnames", () => {
    expect(() => parseHttpUrl("http://localhost/x")).toThrow(SsrfError);
  });

  it("accepts https public host shape", () => {
    const url = parseHttpUrl("https://example.com/path");
    expect(url.hostname).toBe("example.com");
  });
});

describe("assertSafeUrl", () => {
  it("blocks when DNS resolves to private IP", async () => {
    await expect(
      assertSafeUrl("https://evil.example", async () => ["10.0.0.1"]),
    ).rejects.toBeInstanceOf(SsrfError);
  });

  it("allows when DNS resolves to public IP", async () => {
    const url = await assertSafeUrl(
      "https://example.com/a",
      async () => ["93.184.216.34"],
    );
    expect(url.hostname).toBe("example.com");
  });
});
