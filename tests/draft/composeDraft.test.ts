import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  addDraftSection,
  changeAngleClearDraft,
  createBlankDraft,
  deleteDraftSection,
  getDb,
  getOrCreateCurrent,
  reorderDraftSections,
  replaceDraftGraph,
  resetDbSingleton,
} from "@/lib/db";
import { normalizeDraftMode } from "@/lib/types/draft";
import {
  createDraftSectionBodySchema,
  generateDraftBodySchema,
} from "@/lib/validation/draft";
import { coerceProjectStage } from "@/lib/workspace/stages";

function tempDbPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "editorial-compose-"));
  return path.join(dir, "test.db");
}

afterEach(() => {
  resetDbSingleton();
});

describe("compose draft APIs (repo)", () => {
  it("rejects outline_only on generate body schema", () => {
    const parsed = generateDraftBodySchema.safeParse({
      mode: "outline_only",
      angleId: "angle-1",
    });
    expect(parsed.success).toBe(false);
  });

  it("maps legacy modes and stages", () => {
    expect(normalizeDraftMode("outline_only")).toBe("blank");
    expect(normalizeDraftMode("manual")).toBe("blank");
    expect(normalizeDraftMode("starter_draft")).toBe("starter_draft");
    expect(coerceProjectStage("draft")).toBe("compose");
    expect(coerceProjectStage("writing")).toBe("compose");
    expect(coerceProjectStage("compose")).toBe("compose");
  });

  it("blank create, add/remove section, change-angle clears", () => {
    const db = getDb(tempDbPath());
    const project = getOrCreateCurrent(db);

    const blank = createBlankDraft(db, project.id, "angle-a");
    expect(blank.mode).toBe("blank");
    expect(blank.sections).toHaveLength(1);
    expect(blank.workingPlain).toMatch(/^#/);

    const withSection = addDraftSection(db, project.id, {
      title: "Takeaway",
      purpose: "One punchy so-what",
    });
    expect(withSection?.sections).toHaveLength(2);
    expect(withSection?.sections.some((s) => s.title === "Takeaway")).toBe(
      true,
    );
    expect(withSection?.workingPlain).toContain("## Takeaway");

    const key = withSection!.sections.find((s) => s.title === "Takeaway")!.key;
    const removed = deleteDraftSection(db, project.id, key);
    expect(removed?.sections).toHaveLength(1);
    expect(removed?.workingPlain).not.toContain("## Takeaway");

    replaceDraftGraph(db, project.id, {
      mode: "starter_draft",
      selectedAngleId: "angle-a",
      sections: [
        {
          key: "headline",
          title: "Headline",
          purpose: "Article title",
          content: "Ship quieter evals",
          sortOrder: 0,
        },
        {
          key: "what_happened",
          title: "What happened",
          purpose: "Lead",
          content: "Vendors cut latency.",
          sortOrder: 1,
        },
      ],
      setSnapshotIfFirstStarter: true,
    });

    const cleared = changeAngleClearDraft(db, project.id, "angle-b");
    expect(cleared.awaitingStart).toBe(true);
    expect(cleared.sections).toHaveLength(0);
    expect(cleared.workingPlain).toBe("");
    expect(cleared.originalSnapshot).toBeNull();
    expect(cleared.selectedAngleId).toBe("angle-b");
  });

  it("allows add without purpose; requires purpose when generate", () => {
    expect(
      createDraftSectionBodySchema.safeParse({ title: "Notes" }).success,
    ).toBe(true);
    expect(
      createDraftSectionBodySchema.safeParse({
        title: "Notes",
        generate: true,
      }).success,
    ).toBe(false);
    expect(
      createDraftSectionBodySchema.safeParse({
        title: "Notes",
        purpose: "Explain the so-what",
        generate: true,
      }).success,
    ).toBe(true);

    const db = getDb(tempDbPath());
    const project = getOrCreateCurrent(db);
    createBlankDraft(db, project.id, "angle-a");
    const added = addDraftSection(db, project.id, { title: "Notes" });
    expect(added?.sections.some((s) => s.title === "Notes")).toBe(true);
    expect(added?.sections.find((s) => s.title === "Notes")?.purpose).toBe("");
  });

  it("reorders sections by orderedKeys", () => {
    const db = getDb(tempDbPath());
    const project = getOrCreateCurrent(db);
    replaceDraftGraph(db, project.id, {
      mode: "blank",
      selectedAngleId: "angle-a",
      sections: [
        {
          key: "headline",
          title: "Headline",
          purpose: "Article title",
          content: "Title",
          sortOrder: 0,
        },
        {
          key: "a",
          title: "A",
          purpose: "",
          content: "First body",
          sortOrder: 1,
        },
        {
          key: "b",
          title: "B",
          purpose: "",
          content: "Second body",
          sortOrder: 2,
        },
      ],
    });

    const reordered = reorderDraftSections(db, project.id, [
      "headline",
      "b",
      "a",
    ]);
    expect(reordered?.sections.map((s) => s.key)).toEqual([
      "headline",
      "b",
      "a",
    ]);
    expect(reordered?.workingPlain.indexOf("## B")).toBeLessThan(
      reordered!.workingPlain.indexOf("## A"),
    );
  });
});
