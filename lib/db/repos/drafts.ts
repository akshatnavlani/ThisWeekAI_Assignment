import { asc, eq } from "drizzle-orm";
import type {
  DraftDto,
  DraftMode,
  DraftSectionDto,
  DraftSectionKey,
} from "@/lib/types/draft";
import {
  DRAFT_SECTION_KEYS,
  DRAFT_SECTION_SORT_ORDER,
  DRAFT_SECTION_TITLES,
  isDraftMode,
  workingPlainFromSections,
} from "@/lib/types/draft";
import type { AppDb } from "../client";
import { newId, nowIso } from "../ids";
import { draftSections, drafts } from "../schema";

function toSectionDto(row: typeof draftSections.$inferSelect): DraftSectionDto {
  const key = row.sectionKey as DraftSectionKey;
  return {
    key,
    title: row.title,
    content: row.content,
    sortOrder: row.sortOrder,
  };
}

function toDraftDto(
  row: typeof drafts.$inferSelect,
  sections: DraftSectionDto[],
): DraftDto {
  const mode: DraftMode = isDraftMode(row.mode) ? row.mode : "manual";
  return {
    id: row.id,
    projectId: row.projectId,
    mode,
    selectedAngleId: row.selectedAngleId,
    originalSnapshot: row.originalSnapshot,
    workingPlain: row.workingPlain,
    sections,
    isAiStarter: mode === "starter_draft",
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

export type ReplaceDraftInput = {
  mode: DraftMode;
  selectedAngleId: string | null;
  sections: Array<{ key: DraftSectionKey; content: string }>;
  /** When true and snapshot empty and mode is starter_draft, set original_snapshot. */
  setSnapshotIfFirstStarter?: boolean;
};

export function replaceDraftGraph(
  db: AppDb,
  projectId: string,
  input: ReplaceDraftInput,
): DraftDto {
  const existing = db
    .select()
    .from(drafts)
    .where(eq(drafts.projectId, projectId))
    .all();

  const now = nowIso();
  const previousSnapshot = existing[0]?.originalSnapshot ?? null;
  const draftId = existing[0]?.id ?? newId();
  const createdAt = existing[0]?.createdAt ?? now;

  const normalized = DRAFT_SECTION_KEYS.map((key) => {
    const found = input.sections.find((s) => s.key === key);
    return {
      key,
      title: DRAFT_SECTION_TITLES[key],
      content: found?.content ?? "",
      sortOrder: DRAFT_SECTION_SORT_ORDER[key],
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

  if (existing[0]) {
    db.delete(draftSections)
      .where(eq(draftSections.draftId, draftId))
      .run();
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
  } else {
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
        content: section.content,
        sortOrder: section.sortOrder,
      })
      .run();
  }

  const dto = getDraftByProject(db, projectId);
  if (!dto) {
    throw new Error("Failed to load draft after replace");
  }
  return dto;
}

export function updateDraftSection(
  db: AppDb,
  projectId: string,
  sectionKey: DraftSectionKey,
  content: string,
): DraftDto | null {
  const draft = getDraftByProject(db, projectId);
  if (!draft) return null;

  const now = nowIso();
  const nextSections = draft.sections.map((s) =>
    s.key === sectionKey ? { ...s, content } : s,
  );
  const workingPlain = workingPlainFromSections(nextSections);

  const existing = db
    .select()
    .from(draftSections)
    .where(eq(draftSections.draftId, draft.id))
    .all()
    .find((s) => s.sectionKey === sectionKey);

  if (existing) {
    db.update(draftSections)
      .set({ content })
      .where(eq(draftSections.id, existing.id))
      .run();
  } else {
    db.insert(draftSections)
      .values({
        id: newId(),
        draftId: draft.id,
        sectionKey,
        title: DRAFT_SECTION_TITLES[sectionKey],
        content,
        sortOrder: DRAFT_SECTION_SORT_ORDER[sectionKey],
      })
      .run();
  }

  db.update(drafts)
    .set({ workingPlain, updatedAt: now })
    .where(eq(drafts.id, draft.id))
    .run();

  return getDraftByProject(db, projectId);
}
