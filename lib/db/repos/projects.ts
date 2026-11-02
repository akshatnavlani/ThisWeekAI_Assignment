import { desc, eq, inArray, sql } from "drizzle-orm";
import type { BriefDto } from "@/lib/types/brief";
import type { DraftDto } from "@/lib/types/draft";
import type { AppDb } from "../client";
import { newId, nowIso } from "../ids";
import { drafts, projects, writingSuggestions } from "../schema";
import { getDraftByProject } from "./drafts";
import { getBriefByProject } from "./research";
import { listSourcesByProject, type SourceDto } from "./sources";

export type ProjectRow = typeof projects.$inferSelect;

export type ProjectDto = {
  id: string;
  title: string;
  stage: string;
  createdAt: string;
  updatedAt: string;
};

export type SuggestionsSummary = {
  pending: number;
  accepted: number;
  rejected: number;
};

export type CurrentProjectPayload = {
  project: ProjectDto;
  sources: SourceDto[];
  brief: BriefDto | null;
  draft: DraftDto | null;
  suggestionsSummary: SuggestionsSummary;
};

export type ProjectUpdate = {
  title?: string;
  stage?: string;
};

function toDto(row: ProjectRow): ProjectDto {
  return {
    id: row.id,
    title: row.title,
    stage: row.stage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function getOrCreateCurrent(db: AppDb): ProjectDto {
  const existing = db
    .select()
    .from(projects)
    .orderBy(desc(projects.updatedAt))
    .limit(1)
    .all();

  if (existing[0]) {
    return toDto(existing[0]);
  }

  const now = nowIso();
  const row: ProjectRow = {
    id: newId(),
    title: "Untitled editorial",
    stage: "sources",
    createdAt: now,
    updatedAt: now,
  };

  db.insert(projects).values(row).run();
  return toDto(row);
}

export function updateCurrent(
  db: AppDb,
  update: ProjectUpdate,
): ProjectDto | null {
  const current = getOrCreateCurrent(db);
  const nextTitle = update.title ?? current.title;
  const nextStage = update.stage ?? current.stage;
  const updatedAt = nowIso();

  db.update(projects)
    .set({
      title: nextTitle,
      stage: nextStage,
      updatedAt,
    })
    .where(eq(projects.id, current.id))
    .run();

  const rows = db
    .select()
    .from(projects)
    .where(eq(projects.id, current.id))
    .limit(1)
    .all();

  return rows[0] ? toDto(rows[0]) : null;
}

function emptySuggestionsSummary(): SuggestionsSummary {
  return { pending: 0, accepted: 0, rejected: 0 };
}

export function loadSuggestionsSummary(
  db: AppDb,
  projectId: string,
): SuggestionsSummary {
  const draftRows = db
    .select({ id: drafts.id })
    .from(drafts)
    .where(eq(drafts.projectId, projectId))
    .all();

  if (draftRows.length === 0) {
    return emptySuggestionsSummary();
  }

  const draftIds = draftRows.map((d) => d.id);
  const counts = db
    .select({
      status: writingSuggestions.status,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(writingSuggestions)
    .where(inArray(writingSuggestions.draftId, draftIds))
    .groupBy(writingSuggestions.status)
    .all();

  const summary = emptySuggestionsSummary();
  for (const row of counts) {
    if (row.status === "pending") summary.pending += row.count;
    else if (row.status === "accepted") summary.accepted += row.count;
    else if (row.status === "rejected") summary.rejected += row.count;
  }

  return summary;
}

export function loadCurrentProjectPayload(db: AppDb): CurrentProjectPayload {
  const project = getOrCreateCurrent(db);
  return {
    project,
    sources: listSourcesByProject(db, project.id),
    brief: getBriefByProject(db, project.id),
    draft: getDraftByProject(db, project.id),
    suggestionsSummary: loadSuggestionsSummary(db, project.id),
  };
}
