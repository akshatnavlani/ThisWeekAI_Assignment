import { apiError } from "@/lib/api/errors";
import { getDb, getOrCreateCurrent, updateCurrent } from "@/lib/db";
import {
  generateDraftForProject,
  InvalidAngleError,
  LlmOutputInvalidError,
  LlmRateLimitError,
  LlmSetupError,
  NeedsBriefError,
} from "@/lib/draft/generateDraft";
import { generateDraftBodySchema } from "@/lib/validation/draft";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_BODY", "Request body must be JSON", 400);
  }

  const parsed = generateDraftBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID_BODY",
      parsed.error.issues.map((i) => i.message).join("; "),
      400,
    );
  }

  try {
    const db = getDb();
    const project = getOrCreateCurrent(db);
    const draft = await generateDraftForProject(db, project.id, parsed.data);
    if (project.stage !== "draft") {
      updateCurrent(db, { stage: "draft" });
    }
    return Response.json({ draft });
  } catch (err) {
    if (err instanceof NeedsBriefError) {
      return apiError("NEEDS_BRIEF", err.message, 409);
    }
    if (err instanceof InvalidAngleError) {
      return apiError("INVALID_ANGLE", err.message, 400);
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
    console.error("POST /api/draft/generate failed", err);
    return apiError("INTERNAL_ERROR", "Failed to generate draft", 500);
  }
}
