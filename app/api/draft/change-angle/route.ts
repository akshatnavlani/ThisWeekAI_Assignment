import { apiError } from "@/lib/api/errors";
import {
  changeAngleClearDraft,
  getDb,
  getOrCreateCurrent,
  updateCurrent,
} from "@/lib/db";
import { getBriefByProject } from "@/lib/db/repos/research";
import { changeAngleBodySchema } from "@/lib/validation/draft";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_BODY", "Request body must be JSON", 400);
  }

  const parsed = changeAngleBodySchema.safeParse(body);
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
    if (!brief?.angles.some((a) => a.id === parsed.data.angleId)) {
      return apiError(
        "INVALID_ANGLE",
        "Selected angle does not belong to the current research brief.",
        400,
      );
    }
    const draft = changeAngleClearDraft(db, project.id, parsed.data.angleId);
    if (project.stage !== "compose") {
      updateCurrent(db, { stage: "compose" });
    }
    return Response.json({ draft });
  } catch (err) {
    console.error("POST /api/draft/change-angle failed", err);
    return apiError("INTERNAL_ERROR", "Failed to change angle", 500);
  }
}
