import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getDb,
  getDraftByProject,
  getOrCreateCurrent,
  replaceDraftGraph,
  resetDbSingleton,
} from "@/lib/db";
import {
  analyzeDraftForProject,
  EmptyDraftError,
  NeedsDraftError,
} from "@/lib/writing/analyzeDraft";

function tempDbPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "editorial-m6-analyze-"));
  return path.join(dir, "test.db");
}

afterEach(() => {
  resetDbSingleton();
});

function seedOutlineDraft(db: ReturnType<typeof getDb>, projectId: string) {
  return replaceDraftGraph(db, projectId, {
    mode: "blank",
    selectedAngleId: null,
    sections: [
      { key: "headline", content: "Quiet models" },
      {
        key: "what_happened",
        content:
          "The release was announced yesterday and it was celebrated by vendors.",
      },
      {
        key: "context",
        content:
          "This is really a shift because teams were made to wait on latency for months.",
      },
      { key: "analysis", content: "Builders should watch lock-in." },
      { key: "implication", content: "Ship evals first." },
      { key: "sources", content: "- Source 1" },
    ],
    setSnapshotIfFirstStarter: false,
  });
}

describe("analyzeDraftForProject", () => {
  it("throws NeedsDraftError without a draft", async () => {
    const db = getDb(tempDbPath());
    const project = getOrCreateCurrent(db);
    await expect(analyzeDraftForProject(db, project.id)).rejects.toBeInstanceOf(
      NeedsDraftError,
    );
  });

  it("throws EmptyDraftError for blank working_plain", async () => {
    const db = getDb(tempDbPath());
    const project = getOrCreateCurrent(db);
    replaceDraftGraph(db, project.id, {
      mode: "blank",
      selectedAngleId: null,
      sections: [
        { key: "headline", content: "" },
        { key: "what_happened", content: "" },
        { key: "context", content: "" },
        { key: "analysis", content: "" },
        { key: "implication", content: "" },
        { key: "sources", content: "" },
      ],
      setSnapshotIfFirstStarter: false,
    });
    await expect(analyzeDraftForProject(db, project.id)).rejects.toBeInstanceOf(
      EmptyDraftError,
    );
  });

  it("sets snapshot when null, persists pending, and uses mock LLM", async () => {
    const db = getDb(tempDbPath());
    const project = getOrCreateCurrent(db);
    seedOutlineDraft(db, project.id);
    expect(getDraftByProject(db, project.id)?.originalSnapshot).toBeNull();

    const result = await analyzeDraftForProject(db, project.id, {
      generateJson: async ({ userPrompt }) => {
        const indices = [...userPrompt.matchAll(/\[(\d+)\] category=/g)].map(
          (m) => Number(m[1]),
        );
        return JSON.stringify({
          suggestions: indices.map((index) => ({
            index,
            explanation: `Issue ${index}`,
            rewrite: `Rewrite ${index}`,
          })),
        });
      },
    });

    expect(result.suggestions.some((s) => s.status === "pending")).toBe(true);
    expect(result.metrics.wordCount).toBeGreaterThan(0);
    const draft = getDraftByProject(db, project.id);
    expect(draft?.originalSnapshot).toBeTruthy();
  });

  it("partial sectionKeys reanalyzes from earliest touched offset", async () => {
    const db = getDb(tempDbPath());
    const project = getOrCreateCurrent(db);
    seedOutlineDraft(db, project.id);

    const mockLlm = async ({ userPrompt }: { userPrompt: string }) => {
      const indices = [...userPrompt.matchAll(/\[(\d+)\] category=/g)].map(
        (m) => Number(m[1]),
      );
      return JSON.stringify({
        suggestions: indices.map((index) => ({
          index,
          explanation: `Issue ${index}`,
          rewrite: `Rewrite ${index}`,
        })),
      });
    };

    const full = await analyzeDraftForProject(db, project.id, {
      generateJson: mockLlm,
    });
    const earlyPending = full.suggestions.filter(
      (s) => s.status === "pending" && s.startOffset < 40,
    );

    const partial = await analyzeDraftForProject(db, project.id, {
      sectionKeys: ["sources"],
      generateJson: mockLlm,
    });

    // Early pending suggestions (before sources) should survive a sources-only reanalyze
    for (const s of earlyPending) {
      expect(
        partial.suggestions.some(
          (p) =>
            p.status === "pending" &&
            p.startOffset === s.startOffset &&
            p.passage === s.passage,
        ),
      ).toBe(true);
    }
  });
});
