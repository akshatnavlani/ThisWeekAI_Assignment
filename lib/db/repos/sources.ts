import { and, asc, eq, isNotNull, like, ne, sql } from "drizzle-orm";
import type { AppDb } from "../client";
import { newId, nowIso } from "../ids";
import { evidenceClaims, sources } from "../schema";
import type { IngestResult } from "@/lib/ingestion";
import type { SourceDto } from "@/lib/types/source";

export type SourceRow = typeof sources.$inferSelect;
export type { SourceDto };

function toDto(row: SourceRow): SourceDto {
  return {
    id: row.id,
    projectId: row.projectId,
    kind: row.kind,
    url: row.url,
    title: row.title,
    content: row.content,
    modality: row.modality,
    status: row.status,
    errorMessage: row.errorMessage,
    imageUrl: row.imageUrl,
    rawMetaJson: row.rawMetaJson,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function listSourcesByProject(
  db: AppDb,
  projectId: string,
): SourceDto[] {
  return db
    .select()
    .from(sources)
    .where(eq(sources.projectId, projectId))
    .orderBy(asc(sources.createdAt))
    .all()
    .map(toDto);
}

export function getSourceById(
  db: AppDb,
  id: string,
): SourceDto | null {
  const rows = db
    .select()
    .from(sources)
    .where(eq(sources.id, id))
    .limit(1)
    .all();
  return rows[0] ? toDto(rows[0]) : null;
}

export function findDuplicateUrl(
  db: AppDb,
  projectId: string,
  url: string,
  excludeId?: string,
): SourceDto | null {
  const rows = excludeId
    ? db
        .select()
        .from(sources)
        .where(
          and(
            eq(sources.projectId, projectId),
            eq(sources.url, url),
            ne(sources.id, excludeId),
          ),
        )
        .limit(1)
        .all()
    : db
        .select()
        .from(sources)
        .where(and(eq(sources.projectId, projectId), eq(sources.url, url)))
        .limit(1)
        .all();

  return rows[0] ? toDto(rows[0]) : null;
}

export function insertSource(
  db: AppDb,
  projectId: string,
  ingested: IngestResult,
): SourceDto {
  const now = nowIso();
  const row: SourceRow = {
    id: newId(),
    projectId,
    kind: ingested.kind,
    url: ingested.url,
    title: ingested.title,
    content: ingested.content,
    modality: ingested.modality,
    status: ingested.status,
    errorMessage: ingested.errorMessage,
    imageUrl: ingested.imageUrl,
    rawMetaJson: ingested.rawMetaJson,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(sources).values(row).run();
  return toDto(row);
}

export function updateSourceFromIngest(
  db: AppDb,
  id: string,
  ingested: IngestResult,
  titleOverride?: string | null,
): SourceDto | null {
  const existing = getSourceById(db, id);
  if (!existing) return null;

  const updatedAt = nowIso();
  db.update(sources)
    .set({
      kind: ingested.kind,
      url: ingested.url,
      title:
        titleOverride !== undefined
          ? titleOverride
          : ingested.title ?? existing.title,
      content: ingested.content,
      modality: ingested.modality,
      status: ingested.status,
      errorMessage: ingested.errorMessage,
      imageUrl: ingested.imageUrl,
      rawMetaJson: ingested.rawMetaJson,
      updatedAt,
    })
    .where(eq(sources.id, id))
    .run();

  return getSourceById(db, id);
}

export function updateSourceFields(
  db: AppDb,
  id: string,
  fields: Partial<{
    title: string | null;
    content: string;
    modality: string;
    status: string;
    errorMessage: string | null;
    imageUrl: string | null;
    url: string | null;
    kind: string;
    rawMetaJson: string | null;
  }>,
): SourceDto | null {
  if (!getSourceById(db, id)) return null;
  db.update(sources)
    .set({ ...fields, updatedAt: nowIso() })
    .where(eq(sources.id, id))
    .run();
  return getSourceById(db, id);
}

export function isSourceCited(db: AppDb, sourceId: string): boolean {
  // source_ids_json is a JSON array of ids — cheap LIKE check is enough for MVP
  const needle = `"${sourceId}"`;
  const rows = db
    .select({ id: evidenceClaims.id })
    .from(evidenceClaims)
    .where(like(evidenceClaims.sourceIdsJson, `%${needle}%`))
    .limit(1)
    .all();
  return rows.length > 0;
}

export function deleteSource(db: AppDb, id: string): boolean {
  const result = db.delete(sources).where(eq(sources.id, id)).run();
  return result.changes > 0;
}

export function countUsableSources(db: AppDb, projectId: string): number {
  const rows = db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(sources)
    .where(
      and(
        eq(sources.projectId, projectId),
        eq(sources.status, "ready"),
        isNotNull(sources.content),
        sql`length(trim(${sources.content})) > 0`,
      ),
    )
    .all();
  return rows[0]?.count ?? 0;
}
