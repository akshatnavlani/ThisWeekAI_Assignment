import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getDb,
  getDraftByProject,
  getOrCreateCurrent,
  replaceDraftGraph,
  replacePendingSuggestions,
  resetDbSingleton,
} from "@/lib/db";
import {
  acceptSuggestionForProject,
  acceptSuggestionsEndToStart,
  StaleSuggestionError,
} from "@/lib/writing/acceptSuggestion";
import { analyzeDraftForProject } from "@/lib/writing/analyzeDraft";

function tempDbPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "editorial-m6-accept-"));
  return path.join(dir, "test.db");
}

afterEach(() => {
  resetDbSingleton();
});

describe("acceptSuggestionForProject", () => {
  it("applies rewrite, keeps snapshot, syncs sections", async () => {
    const db = getDb(tempDbPath());
    const project = getOrCreateCurrent(db);
    replaceDraftGraph(db, project.id, {
      mode: "starter_draft",
      selectedAngleId: null,
      sections: [
        { key: "headline", content: "Title" },
        { key: "what_happened", content: "Alpha was announced." },
        { key: "context", content: "Context body." },
        { key: "analysis", content: "Analysis body." },
        { key: "implication", content: "Implication body." },
        { key: "sources", content: "- A" },
      ],
    });
    const before = getDraftByProject(db, project.id)!;
    const snapshot = before.originalSnapshot;
    expect(snapshot).toBeTruthy();

    const analyzed = await analyzeDraftForProject(db, project.id, {
      generateJson: async ({ userPrompt }) => {
        const indices = [...userPrompt.matchAll(/\[(\d+)\] category=/g)].map(
          (m) => Number(m[1]),
        );
        return JSON.stringify({
          suggestions: indices.map((index) => ({
            index,
            explanation: "Tighten",
            rewrite: "FIXED",
          })),
        });
      },
    });

    const pending = analyzed.suggestions.filter((s) => s.status === "pending");
    expect(pending.length).toBeGreaterThan(0);
    const target = pending[0]!;

    const result = acceptSuggestionForProject(db, project.id, target.id);
    expect(result.draft.workingPlain).toContain("FIXED");
    expect(result.draft.originalSnapshot).toBe(snapshot);
    expect(
      result.suggestions.find((s) => s.id === target.id)?.status,
    ).toBe("accepted");
  });

  it("throws STALE when passage no longer matches", () => {
    const db = getDb(tempDbPath());
    const project = getOrCreateCurrent(db);
    const draft = replaceDraftGraph(db, project.id, {
      mode: "starter_draft",
      selectedAngleId: null,
      sections: [
        { key: "headline", content: "Title" },
        { key: "what_happened", content: "Hello world today." },
        { key: "context", content: "Ctx" },
        { key: "analysis", content: "An" },
        { key: "implication", content: "Im" },
        { key: "sources", content: "- S" },
      ],
    });

    const plain = draft.workingPlain;
    const start = plain.indexOf("Hello");
    const end = start + "Hello".length;
    const [suggestion] = replacePendingSuggestions(db, draft.id, [
      {
        category: "filler",
        passage: "Hello",
        startOffset: start,
        endOffset: end,
        explanation: "x",
        rewrite: "Hi",
      },
    ]);

    // Corrupt working text without clearing suggestion (simulate drift)
    replaceDraftGraph(db, project.id, {
      mode: "starter_draft",
      selectedAngleId: null,
      sections: [
        { key: "headline", content: "Title" },
        { key: "what_happened", content: "Changed world today." },
        { key: "context", content: "Ctx" },
        { key: "analysis", content: "An" },
        { key: "implication", content: "Im" },
        { key: "sources", content: "- S" },
      ],
    });
    // Re-insert stale suggestion after replace cleared pending
    const again = getDraftByProject(db, project.id)!;
    const [stale] = replacePendingSuggestions(db, again.id, [
      {
        category: "filler",
        passage: "Hello",
        startOffset: start,
        endOffset: end,
        explanation: "x",
        rewrite: "Hi",
      },
    ]);

    expect(() =>
      acceptSuggestionForProject(db, project.id, stale!.id),
    ).toThrow(StaleSuggestionError);
    void suggestion;
  });

  it("accepts multiple end-to-start without corruption", () => {
    const db = getDb(tempDbPath());
    const project = getOrCreateCurrent(db);
    const draft = replaceDraftGraph(db, project.id, {
      mode: "starter_draft",
      selectedAngleId: null,
      sections: [
        { key: "headline", content: "Title" },
        { key: "what_happened", content: "AAA BBB CCC" },
        { key: "context", content: "Ctx" },
        { key: "analysis", content: "An" },
        { key: "implication", content: "Im" },
        { key: "sources", content: "- S" },
      ],
    });

    const plain = draft.workingPlain;
    const aStart = plain.indexOf("AAA");
    const bStart = plain.indexOf("BBB");
    const cStart = plain.indexOf("CCC");

    const pending = replacePendingSuggestions(db, draft.id, [
      {
        category: "filler",
        passage: "AAA",
        startOffset: aStart,
        endOffset: aStart + 3,
        explanation: "a",
        rewrite: "A1",
      },
      {
        category: "filler",
        passage: "BBB",
        startOffset: bStart,
        endOffset: bStart + 3,
        explanation: "b",
        rewrite: "B1",
      },
      {
        category: "filler",
        passage: "CCC",
        startOffset: cStart,
        endOffset: cStart + 3,
        explanation: "c",
        rewrite: "C1",
      },
    ]);

    const result = acceptSuggestionsEndToStart(
      db,
      project.id,
      pending.map((p) => p.id),
    );
    expect(result.draft.workingPlain).toContain("A1");
    expect(result.draft.workingPlain).toContain("B1");
    expect(result.draft.workingPlain).toContain("C1");
    expect(result.draft.workingPlain).not.toContain("AAA");
  });
});
