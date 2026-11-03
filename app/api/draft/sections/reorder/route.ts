import { apiError } from "@/lib/api/errors";
import {
  getDb,
  getOrCreateCurrent,
  reorderDraftSections,
} from "@/lib/db";
import { reorderDraftSectionsBodySchema } from "@/lib/validation/draft";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_BODY", "Request body must be JSON", 400);
  }

  const parsed = reorderDraftSectionsBodySchema.safeParse(body);
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
    const draft = reorderDraftSections(
      db,
      project.id,
      parsed.data.orderedKeys,
    );
    if (!draft) {
      return apiError(
        "INVALID_BODY",
        "orderedKeys must be a permutation of current section keys",
        400,
      );
    }
    return Response.json({ draft });
  } catch (err) {
    console.error("POST /api/draft/sections/reorder failed", err);
    return apiError("INTERNAL_ERROR", "Failed to reorder sections", 500);
  }
}
