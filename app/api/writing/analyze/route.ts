import { z } from "zod";
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

const analyzeBodySchema = z
  .object({
    sectionKeys: z.array(z.string().trim().min(1)).optional(),
  })
  .optional();

export async function POST(request: Request) {
  let sectionKeys: string[] | undefined;
  try {
    const text = await request.text();
    if (text.trim()) {
      const parsed = analyzeBodySchema.safeParse(JSON.parse(text));
      if (!parsed.success) {
        return apiError(
          "INVALID_BODY",
          parsed.error.issues.map((i) => i.message).join("; "),
          400,
        );
      }
      sectionKeys = parsed.data?.sectionKeys;
    }
  } catch {
    return apiError("INVALID_BODY", "Request body must be JSON", 400);
  }

  try {
    const db = getDb();
    const project = getOrCreateCurrent(db);
    const result = await analyzeDraftForProject(db, project.id, {
      sectionKeys,
    });
    if (project.stage !== "compose") {
      updateCurrent(db, { stage: "compose" });
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
