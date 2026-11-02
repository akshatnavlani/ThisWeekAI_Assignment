import { apiError } from "@/lib/api/errors";
import {
  getDb,
  getDraftByProject,
  getOrCreateCurrent,
  updateCurrent,
} from "@/lib/db";
import {
  analyzeDraftForProject,
  EmptyDraftError,
  NeedsDraftError,
} from "@/lib/writing/analyzeDraft";
import {
  LlmOutputInvalidError,
  LlmRateLimitError,
  LlmSetupError,
} from "@/lib/writing/suggestRewrites";

export async function POST() {
  try {
    const db = getDb();
    const project = getOrCreateCurrent(db);
    const result = await analyzeDraftForProject(db, project.id);
    if (project.stage !== "writing") {
      updateCurrent(db, { stage: "writing" });
    }
    const draft = getDraftByProject(db, project.id);
    return Response.json({
      draft,
      suggestions: result.suggestions,
      metrics: result.metrics,
    });
  } catch (err) {
    if (err instanceof NeedsDraftError) {
      return apiError("NEEDS_DRAFT", err.message, 409);
    }
    if (err instanceof EmptyDraftError) {
      return apiError("EMPTY_DRAFT", err.message, 409);
    }
    if (err instanceof LlmSetupError) {
      return apiError("LLM_SETUP", err.message, 503);
    }
    if (err instanceof LlmRateLimitError) {
      return apiError(
        "LLM_RATE_LIMIT",
        "Gemini rate limit hit — wait and retry.",
        429,
      );
    }
    if (err instanceof LlmOutputInvalidError) {
      return apiError("LLM_OUTPUT_INVALID", err.message, 422);
    }
    console.error("POST /api/writing/analyze failed", err);
    return apiError("INTERNAL_ERROR", "Failed to analyze writing", 500);
  }
}
