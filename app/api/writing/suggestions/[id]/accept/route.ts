import { apiError } from "@/lib/api/errors";
import { getDb, getOrCreateCurrent } from "@/lib/db";
import {
  acceptSuggestionForProject,
  InvalidSuggestionError,
  NeedsDraftError,
  StaleSuggestionError,
} from "@/lib/writing/acceptSuggestion";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const db = getDb();
    const project = getOrCreateCurrent(db);
    const result = acceptSuggestionForProject(db, project.id, id);
    return Response.json(result);
  } catch (err) {
    if (err instanceof NeedsDraftError) {
      return apiError("NEEDS_DRAFT", err.message, 409);
    }
    if (err instanceof StaleSuggestionError) {
      return apiError("STALE_SUGGESTION", err.message, 409);
    }
    if (err instanceof InvalidSuggestionError) {
      return apiError("VALIDATION_ERROR", err.message, 400);
    }
    console.error("POST /api/writing/suggestions/[id]/accept failed", err);
    return apiError("INTERNAL_ERROR", "Failed to accept suggestion", 500);
  }
}
