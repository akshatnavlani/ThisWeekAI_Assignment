import { apiError } from "@/lib/api/errors";
import { getDb, getOrCreateCurrent, updateDraftSection } from "@/lib/db";
import { isDraftSectionKey } from "@/lib/types/draft";
import { patchDraftSectionBodySchema } from "@/lib/validation/draft";

type RouteContext = {
  params: Promise<{ sectionKey: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { sectionKey } = await context.params;
  if (!isDraftSectionKey(sectionKey)) {
    return apiError("INVALID_SECTION", `Unknown section key: ${sectionKey}`, 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_BODY", "Request body must be JSON", 400);
  }

  const parsed = patchDraftSectionBodySchema.safeParse(body);
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
    const draft = updateDraftSection(
      db,
      project.id,
      sectionKey,
      parsed.data.content,
    );
    if (!draft) {
      return apiError(
        "NEEDS_DRAFT",
        "Generate a draft before editing sections.",
        409,
      );
    }
    return Response.json({ draft });
  } catch (err) {
    console.error("PATCH /api/draft/sections/[sectionKey] failed", err);
    return apiError("INTERNAL_ERROR", "Failed to update draft section", 500);
  }
}
