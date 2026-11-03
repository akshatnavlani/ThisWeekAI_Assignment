import { z } from "zod";
import { apiError } from "@/lib/api/errors";
import { getDb, getOrCreateCurrent, updateCurrent } from "@/lib/db";
import { createBlankDraft } from "@/lib/db/repos/drafts";
import { getBriefByProject } from "@/lib/db/repos/research";

const blankBodySchema = z.object({
  angleId: z.string().trim().min(1),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_BODY", "Request body must be JSON", 400);
  }

  const parsed = blankBodySchema.safeParse(body);
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
    const brief = getBriefByProject(db, project.id);
    if (!brief || brief.angles.length < 1) {
      return apiError(
        "NEEDS_BRIEF",
        "Generate a research brief with angles before composing.",
        409,
      );
    }
    const angleOk = brief.angles.some((a) => a.id === parsed.data.angleId);
    const angleId = angleOk
      ? parsed.data.angleId
      : brief.angles[0]!.id;
    const draft = createBlankDraft(db, project.id, angleId);
    if (project.stage !== "compose") {
      updateCurrent(db, { stage: "compose" });
    }
    return Response.json({ draft });
  } catch (err) {
    console.error("POST /api/draft/blank failed", err);
    return apiError("INTERNAL_ERROR", "Failed to create blank draft", 500);
  }
}
