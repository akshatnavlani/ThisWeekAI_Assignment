import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getBriefByProject,
  getDb,
  getOrCreateCurrent,
  insertSource,
  resetDbSingleton,
} from "@/lib/db";
import { ingestSource } from "@/lib/ingestion";
import {
  generateBriefForProject,
  NeedsSourcesError,
} from "@/lib/research/generateBrief";

function tempDbPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "editorial-m4-"));
  return path.join(dir, "test.db");
}

afterEach(() => {
  resetDbSingleton();
});

async function seedReadySources(count: number) {
  const db = getDb(tempDbPath());
  const project = getOrCreateCurrent(db);
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const ingested = await ingestSource({
      content: `Ready source body ${i + 1} about AI tooling for founders and builders.`,
      title: `Source ${i + 1}`,
    });
    const row = insertSource(db, project.id, ingested);
    ids.push(row.id);
  }
  return { db, project, ids };
}

function validBriefJson(ids: string[]) {
  return JSON.stringify({
    whatHappened: "Vendors shipped quieter models.",
    whyItMatters: "Operators can cut inference cost.",
    facts: [{ text: "Latency improved.", sourceIds: [ids[0]] }],
    analysis: [
      {
        text: "May shift vendor lock-in.",
        kind: "analysis",
        sourceIds: [ids[1]],
      },
    ],
    connections: [
      { text: "Links eval rigor with shipping speed.", sourceIds: [ids[0], ids[2]] },
    ],
    angles: [
      {
        title: "Quiet speed",
        description: "Why latency is the story for builders.",
      },
    ],
  });
}

describe("generateBriefForProject", () => {
  it("throws NEEDS_SOURCES when fewer than 3 ready sources", async () => {
    const { db, project } = await seedReadySources(2);
    await expect(generateBriefForProject(db, project.id)).rejects.toBeInstanceOf(
      NeedsSourcesError,
    );
  });

  it("persists brief with angles and replaces on second generate", async () => {
    const { db, project, ids } = await seedReadySources(3);
    let calls = 0;
    const generateJson = async () => {
      calls += 1;
      const payload = JSON.parse(validBriefJson(ids)) as {
        angles: { title: string; description: string }[];
      };
      if (calls === 2) {
        payload.angles = [
          { title: "Second angle", description: "Replaced graph" },
        ];
      }
      return JSON.stringify(payload);
    };

    const first = await generateBriefForProject(db, project.id, { generateJson });
    expect(first.angles.length).toBeGreaterThanOrEqual(1);
    expect(first.angles[0]?.title).toBe("Quiet speed");

    const second = await generateBriefForProject(db, project.id, { generateJson });
    expect(second.angles[0]?.title).toBe("Second angle");
    expect(getBriefByProject(db, project.id)?.id).toBe(second.id);
  });

  it("repairs after invalid first response", async () => {
    const { db, project, ids } = await seedReadySources(3);
    let calls = 0;
    const generateJson = async () => {
      calls += 1;
      if (calls === 1) return "{not-json";
      return validBriefJson(ids);
    };

    const brief = await generateBriefForProject(db, project.id, { generateJson });
    expect(brief.angles.length).toBeGreaterThanOrEqual(1);
    expect(calls).toBe(2);
  });
});
