import { apiError } from "@/lib/api/errors";
import {
  getDb,
  loadCurrentProjectPayload,
  updateCurrent,
} from "@/lib/db";
import { patchProjectSchema } from "@/lib/validation/project";

export async function GET() {
  try {
    const db = getDb();
    const payload = loadCurrentProjectPayload(db);
    return Response.json(payload);
  } catch (err) {
    console.error("GET /api/projects/current failed", err);
    return apiError(
      "INTERNAL_ERROR",
      "Failed to load current project",
      500,
    );
  }
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be JSON", 400);
  }

  const parsed = patchProjectSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid project update",
      400,
      { issues: parsed.error.issues },
    );
  }

  try {
    const db = getDb();
    const project = updateCurrent(db, parsed.data);
    if (!project) {
      return apiError("NOT_FOUND", "No current project found", 404);
    }
    return Response.json({ project });
  } catch (err) {
    console.error("PATCH /api/projects/current failed", err);
    return apiError(
      "INTERNAL_ERROR",
      "Failed to update current project",
      500,
    );
  }
}
