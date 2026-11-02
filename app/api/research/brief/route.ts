import { apiError } from "@/lib/api/errors";
import {
  getDb,
  getOrCreateCurrent,
  listSourcesByProject,
  updateBriefLight,
} from "@/lib/db";
import { sanitizeBriefSourceIds } from "@/lib/research/validateSourceIds";
import { patchBriefSchema } from "@/lib/validation/brief";

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be JSON", 400);
  }

  const parsed = patchBriefSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid brief update", 400, {
      issues: parsed.error.issues,
    });
  }

  try {
    const db = getDb();
    const project = getOrCreateCurrent(db);
    const allowedIds = listSourcesByProject(db, project.id).map((s) => s.id);

    const data = { ...parsed.data };

    if (data.facts || data.analysis || data.connections) {
      const sanitized = sanitizeBriefSourceIds(
        {
          whatHappened: "placeholder",
          whyItMatters: "placeholder",
          facts: data.facts ?? [{ text: "placeholder", sourceIds: allowedIds.slice(0, 1) }],
          analysis: data.analysis ?? [
            {
              text: "placeholder",
              kind: "analysis",
              sourceIds: allowedIds.slice(0, 1),
            },
          ],
          connections: data.connections ?? [
            { text: "placeholder", sourceIds: allowedIds.slice(0, 1) },
          ],
          angles: [{ title: "placeholder", description: "placeholder" }],
        },
        allowedIds,
      );

      if (data.facts) {
        if (sanitized.brief.facts.some((f) => f.sourceIds.length === 0)) {
          return apiError(
            "VALIDATION_ERROR",
            "Each fact must cite at least one known sourceId",
            400,
          );
        }
        data.facts = sanitized.brief.facts;
      }
      if (data.analysis) {
        if (sanitized.brief.analysis.some((f) => f.sourceIds.length === 0)) {
          return apiError(
            "VALIDATION_ERROR",
            "Each analysis item must cite at least one known sourceId",
            400,
          );
        }
        data.analysis = sanitized.brief.analysis;
      }
      if (data.connections) {
        if (sanitized.brief.connections.some((f) => f.sourceIds.length === 0)) {
          return apiError(
            "VALIDATION_ERROR",
            "Each connection must cite at least one known sourceId",
            400,
          );
        }
        data.connections = sanitized.brief.connections;
      }
    }

    const brief = updateBriefLight(db, project.id, data);
    if (!brief) {
      return apiError("NOT_FOUND", "No research brief to edit yet", 404);
    }
    return Response.json({ brief });
  } catch (err) {
    console.error("PATCH /api/research/brief failed", err);
    return apiError("INTERNAL_ERROR", "Failed to update research brief", 500);
  }
}
