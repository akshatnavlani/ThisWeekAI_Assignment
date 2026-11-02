import type { AppDb } from "@/lib/db/client";
import {
  getDraftByProject,
  setOriginalSnapshotIfEmpty,
} from "@/lib/db/repos/drafts";
import { replacePendingSuggestions } from "@/lib/db/repos/suggestions";
import type { GenerateJsonFn } from "@/lib/llm/client";
import type { AnalyzeResult } from "@/lib/types/writing";
import { detectComplex } from "./detectComplex";
import { detectFiller } from "./detectFiller";
import { detectPassive } from "./detectPassive";
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

export async function analyzeDraftForProject(
  db: AppDb,
  projectId: string,
  deps: { generateJson?: GenerateJsonFn } = {},
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

  const detected = [
    ...detectComplex(plain),
    ...detectPassive(plain),
    ...detectFiller(plain),
  ];
  const resolved = resolveOverlaps(detected).slice(0, MAX_LLM_SPANS);
  const suggested = await suggestRewrites(resolved, deps);

  const suggestions = replacePendingSuggestions(
    db,
    draft.id,
    suggested.map((s) => ({
      category: s.category,
      passage: s.passage,
      startOffset: s.startOffset,
      endOffset: s.endOffset,
      explanation: s.explanation,
      rewrite: s.rewrite,
    })),
  );

  return {
    draftId: draft.id,
    suggestions,
    metrics: computeMetrics(plain),
  };
}
