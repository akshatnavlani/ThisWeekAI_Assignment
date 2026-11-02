import { apiError } from "@/lib/api/errors";
import {
  findDuplicateUrl,
  getDb,
  getOrCreateCurrent,
  insertSource,
} from "@/lib/db";
import { ingestSource, normalizeUrl } from "@/lib/ingestion";
import { createSourceSchema } from "@/lib/validation/source";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be JSON", 400);
  }

  const parsed = createSourceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid source payload", 400, {
      issues: parsed.error.issues,
    });
  }

  const urlRaw = parsed.data.url?.trim() || null;
  let normalizedUrl: string | null = null;
  if (urlRaw) {
    try {
      normalizedUrl = normalizeUrl(urlRaw);
    } catch {
      return apiError("VALIDATION_ERROR", "Invalid URL", 400);
    }
  }

  try {
    const db = getDb();
    const project = getOrCreateCurrent(db);

    if (normalizedUrl) {
      const dup = findDuplicateUrl(db, project.id, normalizedUrl);
      if (dup) {
        return apiError(
          "DUPLICATE_URL",
          "A source with this URL already exists in the project",
          409,
          { existingSourceId: dup.id },
        );
      }
    }

    const ingested = await ingestSource({
      url: normalizedUrl,
      title: parsed.data.title,
      content: parsed.data.content,
      kind: parsed.data.kind,
    });

    const source = insertSource(db, project.id, ingested);
    return Response.json({ source }, { status: 201 });
  } catch (err) {
    console.error("POST /api/sources failed", err);
    return apiError("INTERNAL_ERROR", "Failed to add source", 500);
  }
}
