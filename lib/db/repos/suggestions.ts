import { and, desc, eq } from "drizzle-orm";
import type {
  SuggestionCategory,
  SuggestionDto,
  SuggestionStatus,
} from "@/lib/types/writing";
import {
  isSuggestionCategory,
  isSuggestionStatus,
} from "@/lib/types/writing";
import type { AppDb } from "../client";
import { newId, nowIso } from "../ids";
import { writingSuggestions } from "../schema";

function toDto(row: typeof writingSuggestions.$inferSelect): SuggestionDto {
  const category: SuggestionCategory = isSuggestionCategory(row.category)
    ? row.category
    : "complex";
  const status: SuggestionStatus = isSuggestionStatus(row.status)
    ? row.status
    : "pending";
  return {
    id: row.id,
    draftId: row.draftId,
    category,
    passage: row.passage,
    startOffset: row.startOffset,
    endOffset: row.endOffset,
    explanation: row.explanation,
    rewrite: row.rewrite,
    status,
    createdAt: row.createdAt,
  };
}

export function listSuggestionsByDraft(
  db: AppDb,
  draftId: string,
): SuggestionDto[] {
  return db
    .select()
    .from(writingSuggestions)
    .where(eq(writingSuggestions.draftId, draftId))
    .orderBy(desc(writingSuggestions.createdAt))
    .all()
    .map(toDto);
}

export function getSuggestionById(
  db: AppDb,
  id: string,
): SuggestionDto | null {
  const rows = db
    .select()
    .from(writingSuggestions)
    .where(eq(writingSuggestions.id, id))
    .limit(1)
    .all();
  return rows[0] ? toDto(rows[0]) : null;
}

export type NewPendingSuggestion = {
  category: SuggestionCategory;
  passage: string;
  startOffset: number;
  endOffset: number;
  explanation: string;
  rewrite: string;
};

export function clearPendingForDraft(db: AppDb, draftId: string): void {
  db.delete(writingSuggestions)
    .where(
      and(
        eq(writingSuggestions.draftId, draftId),
        eq(writingSuggestions.status, "pending"),
      ),
    )
    .run();
}

export function replacePendingSuggestions(
  db: AppDb,
  draftId: string,
  rows: NewPendingSuggestion[],
): SuggestionDto[] {
  clearPendingForDraft(db, draftId);
  const now = nowIso();
  for (const row of rows) {
    db.insert(writingSuggestions)
      .values({
        id: newId(),
        draftId,
        category: row.category,
        passage: row.passage,
        startOffset: row.startOffset,
        endOffset: row.endOffset,
        explanation: row.explanation,
        rewrite: row.rewrite,
        status: "pending",
        createdAt: now,
      })
      .run();
  }
  return listSuggestionsByDraft(db, draftId);
}

export function markSuggestionStatus(
  db: AppDb,
  id: string,
  status: SuggestionStatus,
): SuggestionDto | null {
  db.update(writingSuggestions)
    .set({ status })
    .where(eq(writingSuggestions.id, id))
    .run();
  return getSuggestionById(db, id);
}

export function deleteSuggestion(db: AppDb, id: string): void {
  db.delete(writingSuggestions).where(eq(writingSuggestions.id, id)).run();
}

export function updateSuggestionOffsets(
  db: AppDb,
  id: string,
  startOffset: number,
  endOffset: number,
): void {
  db.update(writingSuggestions)
    .set({ startOffset, endOffset })
    .where(eq(writingSuggestions.id, id))
    .run();
}
