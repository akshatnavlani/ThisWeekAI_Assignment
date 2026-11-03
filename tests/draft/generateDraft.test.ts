import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getDraftByProject,
  getDb,
  getOrCreateCurrent,
  insertSource,
  resetDbSingleton,
} from "@/lib/db";
import {
  generateDraftForProject,
  InvalidAngleError,
  NeedsBriefError,
} from "@/lib/draft/generateDraft";
import { ingestSource } from "@/lib/ingestion";
import { replaceBriefGraph } from "@/lib/db/repos/research";

function tempDbPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "editorial-m5-"));
  return path.join(dir, "test.db");
}

afterEach(() => {
  resetDbSingleton();
});

async function seedBriefWithSources() {
  const db = getDb(tempDbPath());
  const project = getOrCreateCurrent(db);
  const ids: string[] = [];
  for (let i = 0; i < 3; i++) {
    const ingested = await ingestSource({
      content: `Ready source body ${i + 1} about AI tooling.`,
      title: `Source ${i + 1}`,
    });
    const row = insertSource(db, project.id, ingested);
    ids.push(row.id);
  }

  const brief = replaceBriefGraph(db, project.id, {
    whatHappened: "Vendors shipped quieter models.",
    whyItMatters: "Operators can cut inference cost.",
    facts: [{ text: "Latency improved.", sourceIds: [ids[0]!] }],
    analysis: [
      {
        text: "May shift vendor lock-in.",
        kind: "analysis",
        sourceIds: [ids[1]!],
      },
    ],
    connections: [
      { text: "Links eval rigor with shipping speed.", sourceIds: [ids[0]!, ids[2]!] },
    ],
    angles: [
      {
        title: "Quiet speed",
        description: "Why latency is the story for builders.",
      },
    ],
  });

  return { db, project, brief, angleId: brief.angles[0]!.id };
}

function validDraftJson() {
  return JSON.stringify({
    sections: [
      { key: "headline", title: "Headline", content: "Quiet speed wins" },
      {
        key: "what_happened",
        title: "What happened",
        content: "Vendors cut latency.",
      },
      {
        key: "context",
        title: "Context",
        content: "Inference costs were rising.",
      },
      {
        key: "analysis",
        title: "Analysis",
        content: "Builders should re-check lock-in.",
      },
      {
        key: "implication",
        title: "Implication",
        content: "Ship evals before switching vendors.",
      },
    ],
  });
}

describe("generateDraftForProject", () => {
  it("throws NeedsBriefError without a brief", async () => {
    const db = getDb(tempDbPath());
    const project = getOrCreateCurrent(db);
    await expect(
      generateDraftForProject(db, project.id, {
        mode: "starter_draft",
        angleId: "missing",
      }),
    ).rejects.toBeInstanceOf(NeedsBriefError);
  });

  it("throws InvalidAngleError for unknown angle", async () => {
    const { db, project } = await seedBriefWithSources();
    await expect(
      generateDraftForProject(db, project.id, {
        mode: "starter_draft",
        angleId: "not-an-angle",
      }),
    ).rejects.toBeInstanceOf(InvalidAngleError);
  });

  it("persists starter draft, sources section, and snapshot once", async () => {
    const { db, project, angleId } = await seedBriefWithSources();
    let calls = 0;
    const generateJson = async () => {
      calls += 1;
      const payload = JSON.parse(validDraftJson()) as {
        sections: { key: string; title: string; content: string }[];
      };
      if (calls === 2) {
        payload.sections[0]!.content = "Second headline";
      }
      return JSON.stringify(payload);
    };

    const first = await generateDraftForProject(
      db,
      project.id,
      { mode: "starter_draft", angleId },
      { generateJson },
    );

    expect(first.mode).toBe("starter_draft");
    expect(first.isAiStarter).toBe(true);
    expect(first.sections).toHaveLength(6);
    expect(first.sections.find((s) => s.key === "headline")?.content).toBe(
      "Quiet speed wins",
    );
    expect(first.sections.find((s) => s.key === "sources")?.content).toContain(
      "Source 1",
    );
    expect(first.originalSnapshot).toBeTruthy();
    const snapshot = first.originalSnapshot;

    const second = await generateDraftForProject(
      db,
      project.id,
      { mode: "starter_draft", angleId },
      { generateJson },
    );
    expect(second.sections.find((s) => s.key === "headline")?.content).toBe(
      "Second headline",
    );
    expect(second.originalSnapshot).toBe(snapshot);
    expect(getDraftByProject(db, project.id)?.id).toBe(second.id);
  });

  it("blank draft starts with empty headline and no snapshot", async () => {
    const { db, project, angleId } = await seedBriefWithSources();
    const { createBlankDraft } = await import("@/lib/db/repos/drafts");
    const draft = createBlankDraft(db, project.id, angleId);
    expect(draft.mode).toBe("blank");
    expect(draft.isAiStarter).toBe(false);
    expect(draft.awaitingStart).toBe(false);
    expect(draft.sections).toHaveLength(1);
    expect(draft.sections[0]?.key).toBe("headline");
    expect(draft.originalSnapshot).toBeNull();
  });

  it("repairs after invalid first response", async () => {
    const { db, project, angleId } = await seedBriefWithSources();
    let calls = 0;
    const generateJson = async () => {
      calls += 1;
      if (calls === 1) return "{not-json";
      return validDraftJson();
    };

    const draft = await generateDraftForProject(
      db,
      project.id,
      { mode: "starter_draft", angleId },
      { generateJson },
    );
    expect(draft.sections.find((s) => s.key === "headline")?.content).toBe(
      "Quiet speed wins",
    );
    expect(calls).toBe(2);
  });
});
