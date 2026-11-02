import { apiError } from "@/lib/api/errors";
import { getDb, getDraftByProject, getOrCreateCurrent } from "@/lib/db";
import { computeMetrics } from "@/lib/writing/metrics";

export async function GET() {
  try {
    const db = getDb();
    const project = getOrCreateCurrent(db);
    const draft = getDraftByProject(db, project.id);
    if (!draft) {
      return apiError("NEEDS_DRAFT", "Generate a draft before viewing metrics.", 409);
    }
    return Response.json({ metrics: computeMetrics(draft.workingPlain) });
  } catch (err) {
    console.error("GET /api/writing/metrics failed", err);
    return apiError("INTERNAL_ERROR", "Failed to compute metrics", 500);
  }
}
