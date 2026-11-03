import { apiError } from "@/lib/api/errors";
import { getDb, startNewProject } from "@/lib/db";

/** POST — wipe current editorial workspace and create a blank project. */
export async function POST() {
  try {
    const db = getDb();
    const payload = startNewProject(db);
    return Response.json(payload);
  } catch (err) {
    console.error("POST /api/projects/current/reset failed", err);
    return apiError(
      "INTERNAL_ERROR",
      "Failed to start a new project",
      500,
    );
  }
}
