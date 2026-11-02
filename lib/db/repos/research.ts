import { asc, eq } from "drizzle-orm";
import type { GeminiBrief } from "@/lib/llm/schemas/brief";
import type {
  BriefAnalysisItem,
  BriefConnection,
  BriefDto,
  BriefFact,
} from "@/lib/types/brief";
import type { AppDb } from "../client";
import { newId, nowIso } from "../ids";
import { briefAngles, evidenceClaims, researchBriefs } from "../schema";

function parseJsonArray<T>(raw: string, fallback: T[]): T[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function getBriefByProject(
  db: AppDb,
  projectId: string,
): BriefDto | null {
  const rows = db
    .select()
    .from(researchBriefs)
    .where(eq(researchBriefs.projectId, projectId))
    .orderBy(asc(researchBriefs.createdAt))
    .all();

  const row = rows[0];
  if (!row) return null;

  const angles = db
    .select()
    .from(briefAngles)
    .where(eq(briefAngles.briefId, row.id))
    .orderBy(asc(briefAngles.sortOrder))
    .all()
    .map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      sortOrder: a.sortOrder,
    }));

  return {
    id: row.id,
    projectId: row.projectId,
    whatHappened: row.whatHappened,
    whyItMatters: row.whyItMatters,
    facts: parseJsonArray<BriefFact>(row.factsJson, []),
    analysis: parseJsonArray<BriefAnalysisItem>(row.analysisJson, []),
    connections: parseJsonArray<BriefConnection>(row.connectionsJson, []),
    angles,
    updatedAt: row.updatedAt,
  };
}

export function replaceBriefGraph(
  db: AppDb,
  projectId: string,
  brief: GeminiBrief,
): BriefDto {
  const existing = db
    .select()
    .from(researchBriefs)
    .where(eq(researchBriefs.projectId, projectId))
    .all();

  for (const row of existing) {
    db.delete(evidenceClaims).where(eq(evidenceClaims.briefId, row.id)).run();
    db.delete(briefAngles).where(eq(briefAngles.briefId, row.id)).run();
    db.delete(researchBriefs).where(eq(researchBriefs.id, row.id)).run();
  }

  const now = nowIso();
  const briefId = newId();

  db.insert(researchBriefs)
    .values({
      id: briefId,
      projectId,
      whatHappened: brief.whatHappened,
      whyItMatters: brief.whyItMatters,
      factsJson: JSON.stringify(brief.facts),
      analysisJson: JSON.stringify(brief.analysis),
      connectionsJson: JSON.stringify(brief.connections),
      rawModelJson: JSON.stringify(brief),
      createdAt: now,
      updatedAt: now,
    })
    .run();

  brief.angles.forEach((angle, index) => {
    db.insert(briefAngles)
      .values({
        id: newId(),
        briefId,
        title: angle.title,
        description: angle.description,
        sortOrder: index,
      })
      .run();
  });

  for (const fact of brief.facts) {
    db.insert(evidenceClaims)
      .values({
        id: newId(),
        briefId,
        claimText: fact.text,
        claimType: "fact",
        sourceIdsJson: JSON.stringify(fact.sourceIds),
      })
      .run();
  }

  for (const item of brief.analysis) {
    db.insert(evidenceClaims)
      .values({
        id: newId(),
        briefId,
        claimText: item.text,
        claimType: item.kind,
        sourceIdsJson: JSON.stringify(item.sourceIds),
      })
      .run();
  }

  const dto = getBriefByProject(db, projectId);
  if (!dto) {
    throw new Error("Failed to load brief after replace");
  }
  return dto;
}

export type BriefLightUpdate = {
  whatHappened?: string;
  whyItMatters?: string;
  facts?: BriefFact[];
  analysis?: BriefAnalysisItem[];
  connections?: BriefConnection[];
  angles?: { title: string; description: string }[];
};

export function updateBriefLight(
  db: AppDb,
  projectId: string,
  update: BriefLightUpdate,
): BriefDto | null {
  const current = getBriefByProject(db, projectId);
  if (!current) return null;

  const nextFacts = update.facts ?? current.facts;
  const nextAnalysis = update.analysis ?? current.analysis;
  const nextConnections = update.connections ?? current.connections;
  const nextWhat = update.whatHappened ?? current.whatHappened;
  const nextWhy = update.whyItMatters ?? current.whyItMatters;
  const updatedAt = nowIso();

  db.update(researchBriefs)
    .set({
      whatHappened: nextWhat,
      whyItMatters: nextWhy,
      factsJson: JSON.stringify(nextFacts),
      analysisJson: JSON.stringify(nextAnalysis),
      connectionsJson: JSON.stringify(nextConnections),
      updatedAt,
    })
    .where(eq(researchBriefs.id, current.id))
    .run();

  if (update.angles) {
    db.delete(briefAngles).where(eq(briefAngles.briefId, current.id)).run();
    update.angles.forEach((angle, index) => {
      db.insert(briefAngles)
        .values({
          id: newId(),
          briefId: current.id,
          title: angle.title,
          description: angle.description,
          sortOrder: index,
        })
        .run();
    });
  }

  if (update.facts || update.analysis) {
    db.delete(evidenceClaims)
      .where(eq(evidenceClaims.briefId, current.id))
      .run();
    for (const fact of nextFacts) {
      db.insert(evidenceClaims)
        .values({
          id: newId(),
          briefId: current.id,
          claimText: fact.text,
          claimType: "fact",
          sourceIdsJson: JSON.stringify(fact.sourceIds),
        })
        .run();
    }
    for (const item of nextAnalysis) {
      db.insert(evidenceClaims)
        .values({
          id: newId(),
          briefId: current.id,
          claimText: item.text,
          claimType: item.kind,
          sourceIdsJson: JSON.stringify(item.sourceIds),
        })
        .run();
    }
  }

  return getBriefByProject(db, projectId);
}
