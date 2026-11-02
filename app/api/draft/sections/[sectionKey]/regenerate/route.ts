import { apiError } from "@/lib/api/errors";
import { getDb, getOrCreateCurrent } from "@/lib/db";
import {
  InvalidAngleError,
  NeedsBriefError,
} from "@/lib/draft/generateDraft";
import {
  LlmOutputInvalidError,
  LlmRateLimitError,
  LlmSetupError,
  NeedsDraftError,
  regenerateDraftSection,
} from "@/lib/draft/regenerateSection";
import { isDraftSectionKey } from "@/lib/types/draft";

type RouteContext = {
  params: Promise<{ sectionKey: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { sectionKey } = await context.params;
  if (!isDraftSectionKey(sectionKey)) {
    return apiError("INVALID_SECTION", `Unknown section key: ${sectionKey}`, 400);
  }

  try {
    const db = getDb();
    const project = getOrCreateCurrent(db);
    const draft = await regenerateDraftSection(db, project.id, sectionKey);
    return Response.json({ draft });
  } catch (err) {
    if (err instanceof NeedsDraftError) {
      return apiError("NEEDS_DRAFT", err.message, 409);
    }
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
    console.error(
      "POST /api/draft/sections/[sectionKey]/regenerate failed",
      err,
    );
    return apiError("INTERNAL_ERROR", "Failed to regenerate draft section", 500);
  }
}
