import { apiError } from "@/lib/api/errors";
import {
  addDraftSection,
  getDb,
  getOrCreateCurrent,
} from "@/lib/db";
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
import { createDraftSectionBodySchema } from "@/lib/validation/draft";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_BODY", "Request body must be JSON", 400);
  }

  const parsed = createDraftSectionBodySchema.safeParse(body);
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
    let draft = addDraftSection(db, project.id, {
      title: parsed.data.title,
      purpose: parsed.data.purpose,
    });
    if (!draft) {
      return apiError(
        "NEEDS_DRAFT",
        "Start a blank or starter draft before adding sections.",
        409,
      );
    }

    if (parsed.data.generate) {
      const created = draft.sections[draft.sections.length - 1];
      if (created) {
        draft = await regenerateDraftSection(db, project.id, created.key);
      }
    }

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
    console.error("POST /api/draft/sections failed", err);
    return apiError("INTERNAL_ERROR", "Failed to add draft section", 500);
  }
}
