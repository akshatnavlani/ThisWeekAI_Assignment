import { and, asc, eq } from "drizzle-orm";
import type { DraftDto, DraftMode, DraftSectionDto } from "@/lib/types/draft";
import { normalizeSectionContent } from "@/lib/draft/normalizeSectionContent";
import {
  emptyHeadlineSection,
  isHeadlineSection,
  normalizeDraftMode,
  slugifySectionKey,
  STARTER_SECTION_PURPOSES,
  STARTER_SECTION_TITLES,
  workingPlainFromSections,
} from "@/lib/types/draft";
import type { AppDb } from "../client";
import { newId, nowIso } from "../ids";
import { draftSections, drafts, writingSuggestions } from "../schema";
import { clearPendingForDraft } from "./suggestions";

function deleteAllSuggestionsForDraft(db: AppDb, draftId: string): void {
  db.delete(writingSuggestions)
    .where(eq(writingSuggestions.draftId, draftId))
    .run();
}

function toSectionDto(row: typeof draftSections.$inferSelect): DraftSectionDto {
  return {
    key: row.sectionKey,
    title: row.title,
    purpose: row.purpose ?? "",
    content: row.content,
    sortOrder: row.sortOrder,
  };
}

function toDraftDto(
  row: typeof drafts.$inferSelect,
  sections: DraftSectionDto[],
): DraftDto {
  const mode: DraftMode = normalizeDraftMode(row.mode);
  return {
    id: row.id,
    projectId: row.projectId,
    mode,
    selectedAngleId: row.selectedAngleId,
    originalSnapshot: row.originalSnapshot,
    workingPlain: row.workingPlain,
    sections,
    isAiStarter: mode === "starter_draft",
    awaitingStart: sections.length === 0,
    updatedAt: row.updatedAt,
  };
}

export function getDraftByProject(
  db: AppDb,
  projectId: string,
): DraftDto | null {
  const rows = db
    .select()
    .from(drafts)
    .where(eq(drafts.projectId, projectId))
    .all();

  const row = rows[0];
  if (!row) return null;

  const sections = db
    .select()
    .from(draftSections)
    .where(eq(draftSections.draftId, row.id))
    .orderBy(asc(draftSections.sortOrder))
    .all()
    .map(toSectionDto);

  return toDraftDto(row, sections);
}

export type SectionInput = {
  key: string;
  title?: string;
  purpose?: string;
  content: string;
  sortOrder?: number;
};

export type ReplaceDraftInput = {
  mode: DraftMode;
  selectedAngleId: string | null;
  sections: SectionInput[];
  setSnapshotIfFirstStarter?: boolean;
};

function ensureDraftRow(
  db: AppDb,
  projectId: string,
): { draftId: string; createdAt: string; previousSnapshot: string | null } {
  const existing = db
    .select()
    .from(drafts)
    .where(eq(drafts.projectId, projectId))
    .all();
  const now = nowIso();
  if (existing[0]) {
    return {
      draftId: existing[0].id,
      createdAt: existing[0].createdAt,
      previousSnapshot: existing[0].originalSnapshot,
    };
  }
  const draftId = newId();
  db.insert(drafts)
    .values({
      id: draftId,
      projectId,
      mode: "blank",
      selectedAngleId: null,
      originalSnapshot: null,
      workingPlain: "",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return { draftId, createdAt: now, previousSnapshot: null };
}

export function replaceDraftGraph(
  db: AppDb,
  projectId: string,
  input: ReplaceDraftInput,
): DraftDto {
  const { draftId, createdAt, previousSnapshot } = ensureDraftRow(
    db,
    projectId,
  );
  const now = nowIso();

  const normalized = input.sections.map((s, index) => {
    const title =
      s.title?.trim() ||
      STARTER_SECTION_TITLES[s.key as keyof typeof STARTER_SECTION_TITLES] ||
      s.key;
    return {
      key: s.key,
      title,
      purpose:
        s.purpose?.trim() ||
        STARTER_SECTION_PURPOSES[
          s.key as keyof typeof STARTER_SECTION_PURPOSES
        ] ||
        "",
      content: normalizeSectionContent(s.key, s.content, title),
      sortOrder: s.sortOrder ?? index,
    };
  });

  const workingPlain = workingPlainFromSections(normalized);

  let originalSnapshot = previousSnapshot;
  if (
    input.setSnapshotIfFirstStarter !== false &&
    input.mode === "starter_draft" &&
    !previousSnapshot
  ) {
    originalSnapshot = workingPlain;
  }

  db.delete(draftSections).where(eq(draftSections.draftId, draftId)).run();
  db.update(drafts)
    .set({
      mode: input.mode,
      selectedAngleId: input.selectedAngleId,
      originalSnapshot,
      workingPlain,
      updatedAt: now,
    })
    .where(eq(drafts.id, draftId))
    .run();

  // ensureDraftRow may have inserted; if race empty update missed insert path:
  const still = db
    .select()
    .from(drafts)
    .where(eq(drafts.id, draftId))
    .all()[0];
  if (!still) {
    db.insert(drafts)
      .values({
        id: draftId,
        projectId,
        mode: input.mode,
        selectedAngleId: input.selectedAngleId,
        originalSnapshot,
        workingPlain,
        createdAt,
        updatedAt: now,
      })
      .run();
  }

  for (const section of normalized) {
    db.insert(draftSections)
      .values({
        id: newId(),
        draftId,
        sectionKey: section.key,
        title: section.title,
        purpose: section.purpose,
        content: section.content,
        sortOrder: section.sortOrder,
      })
      .run();
  }

  clearPendingForDraft(db, draftId);

  const dto = getDraftByProject(db, projectId);
  if (!dto) throw new Error("Failed to load draft after replace");
  return dto;
}

export function createBlankDraft(
  db: AppDb,
  projectId: string,
  selectedAngleId: string,
): DraftDto {
  const headline = emptyHeadlineSection();
  return replaceDraftGraph(db, projectId, {
    mode: "blank",
    selectedAngleId,
    sections: [headline],
    setSnapshotIfFirstStarter: false,
  });
}

export function changeAngleClearDraft(
  db: AppDb,
  projectId: string,
  selectedAngleId: string,
): DraftDto {
  const { draftId } = ensureDraftRow(db, projectId);
  const now = nowIso();
  db.delete(draftSections).where(eq(draftSections.draftId, draftId)).run();
  deleteAllSuggestionsForDraft(db, draftId);
  db.update(drafts)
    .set({
      mode: "blank",
      selectedAngleId,
      workingPlain: "",
      originalSnapshot: null,
      updatedAt: now,
    })
    .where(eq(drafts.id, draftId))
    .run();
  const dto = getDraftByProject(db, projectId);
  if (!dto) throw new Error("Failed to load draft after change-angle");
  return dto;
}

export function addDraftSection(
  db: AppDb,
  projectId: string,
  input: { title: string; purpose?: string },
): DraftDto | null {
  const draft = getDraftByProject(db, projectId);
  if (!draft) return null;

  const title = input.title.trim();
  const purpose = (input.purpose ?? "").trim();
  if (!title) return null;

  let key = slugifySectionKey(title);
  const existingKeys = new Set(draft.sections.map((s) => s.key));
  if (existingKeys.has(key)) {
    key = `${key}_${newId().slice(0, 8)}`;
  }

  const sortOrder =
    draft.sections.reduce((max, s) => Math.max(max, s.sortOrder), -1) + 1;

  db.insert(draftSections)
    .values({
      id: newId(),
      draftId: draft.id,
      sectionKey: key,
      title,
      purpose,
      content: "",
      sortOrder,
    })
    .run();

  const next = getDraftByProject(db, projectId);
  if (!next) return null;
  const workingPlain = workingPlainFromSections(
    next.sections.map((s) => ({
      key: s.key,
      title: s.title,
      content: s.content,
      sortOrder: s.sortOrder,
    })),
  );
  db.update(drafts)
    .set({ workingPlain, updatedAt: nowIso() })
    .where(eq(drafts.id, draft.id))
    .run();
  clearPendingForDraft(db, draft.id);
  return getDraftByProject(db, projectId);
}

export function reorderDraftSections(
  db: AppDb,
  projectId: string,
  orderedKeys: string[],
): DraftDto | null {
  const draft = getDraftByProject(db, projectId);
  if (!draft) return null;

  const currentKeys = draft.sections.map((s) => s.key);
  if (
    orderedKeys.length !== currentKeys.length ||
    new Set(orderedKeys).size !== orderedKeys.length
  ) {
    return null;
  }
  const currentSet = new Set(currentKeys);
  if (!orderedKeys.every((k) => currentSet.has(k))) {
    return null;
  }

  const byKey = new Map(draft.sections.map((s) => [s.key, s]));
  for (let i = 0; i < orderedKeys.length; i++) {
    const key = orderedKeys[i]!;
    db.update(draftSections)
      .set({ sortOrder: i })
      .where(
        and(
          eq(draftSections.draftId, draft.id),
          eq(draftSections.sectionKey, key),
        ),
      )
      .run();
  }

  const reordered = orderedKeys.map((key, index) => {
    const section = byKey.get(key)!;
    return {
      key: section.key,
      title: section.title,
      content: section.content,
      sortOrder: index,
    };
  });
  const workingPlain = workingPlainFromSections(reordered);
  db.update(drafts)
    .set({ workingPlain, updatedAt: nowIso() })
    .where(eq(drafts.id, draft.id))
    .run();
  clearPendingForDraft(db, draft.id);
  return getDraftByProject(db, projectId);
}

export function deleteDraftSection(
  db: AppDb,
  projectId: string,
  sectionKey: string,
): DraftDto | null {
  const draft = getDraftByProject(db, projectId);
  if (!draft) return null;

  db.delete(draftSections)
    .where(
      and(
        eq(draftSections.draftId, draft.id),
        eq(draftSections.sectionKey, sectionKey),
      ),
    )
    .run();

  const next = getDraftByProject(db, projectId);
  if (!next) return null;
  const workingPlain = workingPlainFromSections(
    next.sections.map((s) => ({
      key: s.key,
      title: s.title,
      content: s.content,
      sortOrder: s.sortOrder,
    })),
  );
  db.update(drafts)
    .set({ workingPlain, updatedAt: nowIso() })
    .where(eq(drafts.id, draft.id))
    .run();
  clearPendingForDraft(db, draft.id);
  return getDraftByProject(db, projectId);
}

export function updateDraftSection(
  db: AppDb,
  projectId: string,
  sectionKey: string,
  patch: { content?: string; title?: string; purpose?: string },
): DraftDto | null {
  const draft = getDraftByProject(db, projectId);
  if (!draft) return null;

  const existing = draft.sections.find((s) => s.key === sectionKey);
  if (!existing) return null;

  const title = patch.title?.trim() || existing.title;
  const purpose =
    patch.purpose !== undefined ? patch.purpose.trim() : existing.purpose;
  const content =
    patch.content !== undefined
      ? normalizeSectionContent(sectionKey, patch.content, title)
      : existing.content;

  db.update(draftSections)
    .set({ title, purpose, content })
    .where(
      and(
        eq(draftSections.draftId, draft.id),
        eq(draftSections.sectionKey, sectionKey),
      ),
    )
    .run();

  const refreshed = getDraftByProject(db, projectId);
  if (!refreshed) return null;
  const workingPlain = workingPlainFromSections(
    refreshed.sections.map((s) => ({
      key: s.key,
      title: s.title,
      content: s.content,
      sortOrder: s.sortOrder,
    })),
  );
  db.update(drafts)
    .set({ workingPlain, updatedAt: nowIso() })
    .where(eq(drafts.id, draft.id))
    .run();
  clearPendingForDraft(db, draft.id);
  return getDraftByProject(db, projectId);
}

export function setOriginalSnapshotIfEmpty(
  db: AppDb,
  draftId: string,
  plain: string,
): void {
  const rows = db
    .select()
    .from(drafts)
    .where(eq(drafts.id, draftId))
    .limit(1)
    .all();
  const row = rows[0];
  if (!row || row.originalSnapshot) return;
  db.update(drafts)
    .set({ originalSnapshot: plain, updatedAt: nowIso() })
    .where(eq(drafts.id, draftId))
    .run();
}

/**
 * Parse working_plain using the draft's current section order/titles.
 */
export function parseWorkingPlainToSections(
  plain: string,
  sections: DraftSectionDto[],
): Array<{ key: string; content: string }> {
  const ordered = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
  const results: Array<{ key: string; content: string }> = ordered.map((s) => ({
    key: s.key,
    content: "",
  }));

  for (let i = 0; i < ordered.length; i++) {
    const section = ordered[i]!;
    let heading: string;
    let nextPrefix: string;
    if (isHeadlineSection(section)) {
      heading = "# ";
      // content until next ## or end — headline is single line-ish block
      const start = plain.indexOf(heading);
      if (start !== 0 && start < 0) continue;
      const contentStart = start === 0 ? 2 : start + 2;
      let contentEnd = plain.length;
      const nextH2 = plain.indexOf("\n\n## ", contentStart);
      if (nextH2 >= 0) contentEnd = nextH2;
      results[i] = {
        key: section.key,
        content: plain.slice(contentStart, contentEnd).trim(),
      };
      continue;
    }

    heading = `## ${section.title}\n\n`;
    const start = plain.indexOf(heading);
    if (start < 0) continue;
    const contentStart = start + heading.length;
    let contentEnd = plain.length;
    for (let j = i + 1; j < ordered.length; j++) {
      const next = ordered[j]!;
      nextPrefix = isHeadlineSection(next)
        ? ""
        : `\n\n## ${next.title}\n\n`;
      if (!nextPrefix) continue;
      const idx = plain.indexOf(nextPrefix, contentStart);
      if (idx >= 0) {
        contentEnd = idx;
        break;
      }
    }
    results[i] = {
      key: section.key,
      content: plain.slice(contentStart, contentEnd),
    };
  }

  return results;
}

export function applyWorkingPlainAndSyncSections(
  db: AppDb,
  projectId: string,
  nextPlain: string,
): DraftDto | null {
  const draft = getDraftByProject(db, projectId);
  if (!draft) return null;

  const parsed = parseWorkingPlainToSections(nextPlain, draft.sections);
  const now = nowIso();

  for (const section of parsed) {
    const existing = draft.sections.find((s) => s.key === section.key);
    if (!existing) continue;
    db.update(draftSections)
      .set({ content: section.content })
      .where(
        and(
          eq(draftSections.draftId, draft.id),
          eq(draftSections.sectionKey, section.key),
        ),
      )
      .run();
  }

  const refreshed = getDraftByProject(db, projectId);
  if (!refreshed) return null;
  const canonical = workingPlainFromSections(
    refreshed.sections.map((s) => ({
      key: s.key,
      title: s.title,
      content: s.content,
      sortOrder: s.sortOrder,
    })),
  );

  db.update(drafts)
    .set({ workingPlain: canonical, updatedAt: now })
    .where(eq(drafts.id, draft.id))
    .run();

  return getDraftByProject(db, projectId);
}

export { STARTER_SECTION_TITLES };
