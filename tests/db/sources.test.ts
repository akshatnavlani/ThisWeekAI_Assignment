import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  findDuplicateUrl,
  getDb,
  getOrCreateCurrent,
  insertSource,
  resetDbSingleton,
} from "@/lib/db";
import { ingestSource } from "@/lib/ingestion";

function tempDbPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "editorial-m3-"));
  return path.join(dir, "test.db");
}

afterEach(() => {
  resetDbSingleton();
});

describe("sources repo", () => {
  it("inserts paste source and detects duplicate URL", async () => {
    const db = getDb(tempDbPath());
    const project = getOrCreateCurrent(db);

    const paste = await ingestSource({
      content: "First paste source about AI tooling.",
      title: "One",
    });
    const a = insertSource(db, project.id, paste);
    expect(a.status).toBe("ready");

    const withUrl = await ingestSource(
      { url: "https://example.com/unique-m3" },
      {
        fetchPage: async () => ({
          finalUrl: "https://example.com/unique-m3",
          contentType: "text/html",
          body: "<html><body><article><p>Hello founders building with AI.</p></article></body></html>",
        }),
      },
    );
    insertSource(db, project.id, { ...withUrl, url: "https://example.com/unique-m3" });

    const dup = findDuplicateUrl(db, project.id, "https://example.com/unique-m3");
    expect(dup).not.toBeNull();
  });

  it("creates three ready paste sources", async () => {
    const db = getDb(tempDbPath());
    const project = getOrCreateCurrent(db);

    for (let i = 0; i < 3; i++) {
      const ingested = await ingestSource({
        content: `Usable paste body number ${i + 1} with enough text.`,
        title: `Source ${i + 1}`,
      });
      const row = insertSource(db, project.id, ingested);
      expect(row.status).toBe("ready");
      expect(row.content.trim().length).toBeGreaterThan(0);
    }
  });
});
