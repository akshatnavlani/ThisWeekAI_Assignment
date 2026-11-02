import { apiError } from "@/lib/api/errors";
import { getDb, getOrCreateCurrent } from "@/lib/db";
import {
  generateBriefForProject,
  LlmOutputInvalidError,
  LlmRateLimitError,
  LlmSetupError,
  NeedsSourcesError,
} from "@/lib/research/generateBrief";

export async function POST() {
  try {
    const db = getDb();
    const project = getOrCreateCurrent(db);
    const brief = await generateBriefForProject(db, project.id);
    return Response.json({ brief });
  } catch (err) {
    if (err instanceof NeedsSourcesError) {
      return apiError("NEEDS_SOURCES", err.message, 409);
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
    console.error("POST /api/research/generate failed", err);
    return apiError("INTERNAL_ERROR", "Failed to generate research brief", 500);
  }
}
