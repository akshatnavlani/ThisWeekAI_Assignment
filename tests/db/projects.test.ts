import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getDb,
  getOrCreateCurrent,
  resetDbSingleton,
  updateCurrent,
} from "@/lib/db";
import { patchProjectSchema } from "@/lib/validation/project";

function tempDbPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "editorial-m1-"));
  return path.join(dir, "test.db");
}

afterEach(() => {
  resetDbSingleton();
});

describe("projects repo", () => {
  it("creates a default project on first load", () => {
    const dbPath = tempDbPath();
    const db = getDb(dbPath);
    const project = getOrCreateCurrent(db);

    expect(project.title).toBe("Untitled editorial");
    expect(project.stage).toBe("sources");
    expect(project.id).toBeTruthy();
  });

  it("returns the same project id on second call", () => {
    const dbPath = tempDbPath();
    const db = getDb(dbPath);
    const first = getOrCreateCurrent(db);
    const second = getOrCreateCurrent(db);
    expect(second.id).toBe(first.id);
  });

  it("persists title and stage across reconnection", () => {
    const dbPath = tempDbPath();
    const db = getDb(dbPath);
    const created = getOrCreateCurrent(db);

    const updated = updateCurrent(db, {
      title: "This Week in AI — sample",
      stage: "research",
    });
    expect(updated?.id).toBe(created.id);
    expect(updated?.title).toBe("This Week in AI — sample");
    expect(updated?.stage).toBe("research");

    resetDbSingleton();
    const reopened = getDb(dbPath);
    const reloaded = getOrCreateCurrent(reopened);
    expect(reloaded.id).toBe(created.id);
    expect(reloaded.title).toBe("This Week in AI — sample");
    expect(reloaded.stage).toBe("research");
  });
});

describe("patchProjectSchema", () => {
  it("rejects empty body", () => {
    const result = patchProjectSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid stage", () => {
    const result = patchProjectSchema.safeParse({ stage: "publish" });
    expect(result.success).toBe(false);
  });

  it("accepts valid stage update", () => {
    const result = patchProjectSchema.safeParse({ stage: "draft" });
    expect(result.success).toBe(true);
  });
});
