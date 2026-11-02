import type { AppDb } from "@/lib/db/client";
import {
  applyWorkingPlainAndSyncSections,
  getDraftByProject,
} from "@/lib/db/repos/drafts";
import {
  deleteSuggestion,
  getSuggestionById,
  listSuggestionsByDraft,
  markSuggestionStatus,
  updateSuggestionOffsets,
} from "@/lib/db/repos/suggestions";
import type { DraftDto } from "@/lib/types/draft";
import type { SuggestionDto, WritingMetrics } from "@/lib/types/writing";
import { computeMetrics } from "./metrics";

export class NeedsDraftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NeedsDraftError";
  }
}

export class StaleSuggestionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaleSuggestionError";
  }
}

export class InvalidSuggestionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSuggestionError";
  }
}

export type AcceptResult = {
  draft: DraftDto;
  suggestions: SuggestionDto[];
  metrics: WritingMetrics;
};

export function acceptSuggestionForProject(
  db: AppDb,
  projectId: string,
  suggestionId: string,
): AcceptResult {
  const draft = getDraftByProject(db, projectId);
  if (!draft) {
    throw new NeedsDraftError("No draft available.");
  }

  const suggestion = getSuggestionById(db, suggestionId);
  if (!suggestion || suggestion.draftId !== draft.id) {
    throw new InvalidSuggestionError("Suggestion not found for this draft.");
  }
  if (suggestion.status !== "pending") {
    throw new InvalidSuggestionError("Only pending suggestions can be accepted.");
  }

  const { startOffset, endOffset, passage, rewrite } = suggestion;
  if (!rewrite.trim()) {
    throw new InvalidSuggestionError("Suggestion has no rewrite to apply.");
  }

  const current = draft.workingPlain.slice(startOffset, endOffset);
  if (current !== passage) {
    throw new StaleSuggestionError(
      "Draft text changed since analysis — re-analyze before accepting.",
    );
  }

  const nextPlain =
    draft.workingPlain.slice(0, startOffset) +
    rewrite +
    draft.workingPlain.slice(endOffset);

  const updated = applyWorkingPlainAndSyncSections(db, projectId, nextPlain);
  if (!updated) {
    throw new NeedsDraftError("Failed to sync draft after accept.");
  }

  markSuggestionStatus(db, suggestionId, "accepted");

  const delta = rewrite.length - passage.length;
  const pending = listSuggestionsByDraft(db, draft.id).filter(
    (s) => s.status === "pending" && s.id !== suggestionId,
  );

  for (const other of pending) {
    const intersects =
      other.startOffset < endOffset && other.endOffset > startOffset;
    if (intersects) {
      deleteSuggestion(db, other.id);
      continue;
    }
    if (other.startOffset >= endOffset) {
      updateSuggestionOffsets(
        db,
        other.id,
        other.startOffset + delta,
        other.endOffset + delta,
      );
    }
  }

  const suggestions = listSuggestionsByDraft(db, draft.id);
  return {
    draft: updated,
    suggestions,
    metrics: computeMetrics(updated.workingPlain),
  };
}

export function rejectSuggestionForProject(
  db: AppDb,
  projectId: string,
  suggestionId: string,
): { suggestions: SuggestionDto[] } {
  const draft = getDraftByProject(db, projectId);
  if (!draft) {
    throw new NeedsDraftError("No draft available.");
  }

  const suggestion = getSuggestionById(db, suggestionId);
  if (!suggestion || suggestion.draftId !== draft.id) {
    throw new InvalidSuggestionError("Suggestion not found for this draft.");
  }
  if (suggestion.status !== "pending") {
    throw new InvalidSuggestionError("Only pending suggestions can be rejected.");
  }

  markSuggestionStatus(db, suggestionId, "rejected");
  return { suggestions: listSuggestionsByDraft(db, draft.id) };
}

/** Apply multiple pending accepts end→start (test / batch helper). */
export function acceptSuggestionsEndToStart(
  db: AppDb,
  projectId: string,
  suggestionIds: string[],
): AcceptResult {
  const draft = getDraftByProject(db, projectId);
  if (!draft) throw new NeedsDraftError("No draft available.");

  const pending = suggestionIds
    .map((id) => getSuggestionById(db, id))
    .filter((s): s is NonNullable<typeof s> => !!s && s.status === "pending")
    .sort((a, b) => b.startOffset - a.startOffset);

  let last: AcceptResult | null = null;
  for (const s of pending) {
    last = acceptSuggestionForProject(db, projectId, s.id);
  }

  if (!last) {
    return {
      draft,
      suggestions: listSuggestionsByDraft(db, draft.id),
      metrics: computeMetrics(draft.workingPlain),
    };
  }
  return last;
}
