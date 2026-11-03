import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getDb,
  getOrCreateCurrent,
  insertSource,
  resetDbSingleton,
} from "@/lib/db";
import { replaceBriefGraph } from "@/lib/db/repos/research";
import { generateDraftForProject } from "@/lib/draft/generateDraft";
import { regenerateDraftSection } from "@/lib/draft/regenerateSection";
import { ingestSource } from "@/lib/ingestion";

function tempDbPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "editorial-m5-regen-"));
  return path.join(dir, "test.db");
}

afterEach(() => {
  resetDbSingleton();
});

async function seedDraft() {
  const db = getDb(tempDbPath());
  const project = getOrCreateCurrent(db);
  const ids: string[] = [];
  for (let i = 0; i < 2; i++) {
    const ingested = await ingestSource({
      content: `Body ${i + 1}`,
      title: `Source ${i + 1}`,
    });
    ids.push(insertSource(db, project.id, ingested).id);
  }

  const brief = replaceBriefGraph(db, project.id, {
    whatHappened: "Event",
    whyItMatters: "Impact",
    facts: [{ text: "Fact", sourceIds: [ids[0]!] }],
    analysis: [
      { text: "View", kind: "analysis", sourceIds: [ids[0]!] },
    ],
    connections: [{ text: "Link", sourceIds: [ids[0]!, ids[1]!] }],
    angles: [{ title: "Angle", description: "Desc" }],
  });

  const draft = await generateDraftForProject(
    db,
    project.id,
    { mode: "starter_draft", angleId: brief.angles[0]!.id },
    {
      generateJson: async () =>
        JSON.stringify({
          sections: [
            { key: "headline", title: "Headline", content: "Old headline" },
            {
              key: "what_happened",
              title: "What happened",
              content: "Old what",
            },
            { key: "context", title: "Context", content: "Old context" },
            { key: "analysis", title: "Analysis", content: "Old analysis" },
            {
              key: "implication",
              title: "Implication",
              content: "Old implication",
            },
          ],
        }),
    },
  );

  return { db, project, draft, snapshot: draft.originalSnapshot };
}

describe("regenerateDraftSection", () => {
  it("regenerates one prose section without changing snapshot", async () => {
    const { db, project, snapshot } = await seedDraft();
    let called = false;
    const updated = await regenerateDraftSection(
      db,
      project.id,
      "headline",
      {
        generateJson: async () => {
          called = true;
          return JSON.stringify({
            key: "headline",
            title: "Headline",
            content: "New headline",
          });
        },
      },
    );

    expect(called).toBe(true);
    expect(updated.sections.find((s) => s.key === "headline")?.content).toBe(
      "New headline",
    );
    expect(updated.sections.find((s) => s.key === "context")?.content).toBe(
      "Old context",
    );
    expect(updated.originalSnapshot).toBe(snapshot);
  });

  it("accepts regen when model key mismatches but title matches", async () => {
    const { db, project } = await seedDraft();
    const updated = await regenerateDraftSection(
      db,
      project.id,
      "what_happened",
      {
        generateJson: async () =>
          JSON.stringify({
            key: "WhatHappened",
            title: "What happened",
            content: "Vendors cut latency overnight.",
          }),
      },
    );
    expect(
      updated.sections.find((s) => s.key === "what_happened")?.content,
    ).toBe("Vendors cut latency overnight.");
  });

  it("refreshes sources without calling the LLM", async () => {
    const { db, project, snapshot } = await seedDraft();
    let called = false;
    const updated = await regenerateDraftSection(
      db,
      project.id,
      "sources",
      {
        generateJson: async () => {
          called = true;
          return "{}";
        },
      },
    );

    expect(called).toBe(false);
    expect(updated.sections.find((s) => s.key === "sources")?.content).toContain(
      "Source 1",
    );
    expect(updated.originalSnapshot).toBe(snapshot);
  });
});
