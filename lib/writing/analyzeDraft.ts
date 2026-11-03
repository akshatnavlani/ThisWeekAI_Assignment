import type { AppDb } from "@/lib/db/client";
import {
  getDraftByProject,
  setOriginalSnapshotIfEmpty,
} from "@/lib/db/repos/drafts";
import {
  clearPendingFromOffset,
  insertPendingSuggestions,
  listSuggestionsByDraft,
  replacePendingSuggestions,
} from "@/lib/db/repos/suggestions";
import type { GenerateJsonFn } from "@/lib/llm/client";
import { sectionRangesInWorkingPlain } from "@/lib/types/draft";
import type { AnalyzeResult } from "@/lib/types/writing";
import { detectAdverb } from "./detectAdverb";
import { detectComplex } from "./detectComplex";
import { detectFiller } from "./detectFiller";
import { detectJargon } from "./detectJargon";
import { detectPassive } from "./detectPassive";
import { detectWeasel } from "./detectWeasel";
import { computeMetrics } from "./metrics";
import { resolveOverlaps } from "./overlap";
import { suggestRewrites } from "./suggestRewrites";

export const MAX_LLM_SPANS = 12;

export class NeedsDraftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NeedsDraftError";
  }
}

export class EmptyDraftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmptyDraftError";
  }
}

export type AnalyzeDraftOptions = {
  /** Re-analyze from the earliest of these sections through document end. */
  sectionKeys?: string[];
  generateJson?: GenerateJsonFn;
};

export async function analyzeDraftForProject(
  db: AppDb,
  projectId: string,
  deps: AnalyzeDraftOptions = {},
): Promise<AnalyzeResult> {
  const draft = getDraftByProject(db, projectId);
  if (!draft) {
    throw new NeedsDraftError("Generate a draft before analyzing writing.");
  }

  const plain = draft.workingPlain;
  const bodyOnly = draft.sections
    .map((s) => s.content.trim())
    .join("")
    .trim();
  if (!plain.trim() || !bodyOnly) {
    throw new EmptyDraftError("Working draft is empty — add content before analyze.");
  }

  setOriginalSnapshotIfEmpty(db, draft.id, plain);

  const ranges = sectionRangesInWorkingPlain(
    draft.sections.map((s) => ({
      key: s.key,
      title: s.title,
      content: s.content,
      sortOrder: s.sortOrder,
    })),
  );

  const keys = deps.sectionKeys?.filter(Boolean) ?? [];
  const partial = keys.length > 0;
  let fromOffset = 0;

  if (partial) {
    const keySet = new Set(keys);
    const touched = ranges.filter((r) => keySet.has(r.key));
    if (touched.length === 0) {
      return {
        draftId: draft.id,
        suggestions: listSuggestionsByDraft(db, draft.id),
        metrics: computeMetrics(plain),
      };
    }
    fromOffset = Math.min(...touched.map((r) => r.start));
  }

  const detected = [
    ...detectComplex(plain),
    ...detectJargon(plain),
    ...detectPassive(plain),
    ...detectAdverb(plain),
    ...detectFiller(plain),
    ...detectWeasel(plain),
  ].filter((d) => d.startOffset >= fromOffset);

  const resolved = resolveOverlaps(detected).slice(0, MAX_LLM_SPANS);
  const suggested = await suggestRewrites(resolved, {
    generateJson: deps.generateJson,
  });

  const rows = suggested.map((s) => ({
    category: s.category,
    passage: s.passage,
    startOffset: s.startOffset,
    endOffset: s.endOffset,
    explanation: s.explanation,
    rewrite: s.rewrite,
  }));

  let suggestions;
  if (partial) {
    clearPendingFromOffset(db, draft.id, fromOffset);
    suggestions = insertPendingSuggestions(db, draft.id, rows);
  } else {
    suggestions = replacePendingSuggestions(db, draft.id, rows);
  }

  return {
    draftId: draft.id,
    suggestions,
    metrics: computeMetrics(plain),
  };
}
