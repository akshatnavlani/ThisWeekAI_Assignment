import { apiError } from "@/lib/api/errors";
import {
  getDb,
  getSourceById,
  updateSourceFromIngest,
} from "@/lib/db";
import { ingestSource, normalizeUrl } from "@/lib/ingestion";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const db = getDb();
    const existing = getSourceById(db, id);
    if (!existing) {
      return apiError("NOT_FOUND", "Source not found", 404);
    }
    if (!existing.url) {
      return apiError(
        "VALIDATION_ERROR",
        "Source has no URL to re-fetch",
        400,
      );
    }

    const existingPaste =
      existing.content.trim().length > 0 ? existing.content : null;

    let url = existing.url;
    try {
      url = normalizeUrl(existing.url);
    } catch {
      // keep stored url; ingest will surface the failure
    }

    const ingested = await ingestSource({
      url,
      title: existing.title,
      kind: existing.kind as "article" | "tweet" | "other",
      // Do not pass content as new paste — preserve on failure via existingContent
      existingContent: existingPaste,
      existingImageUrl: existing.imageUrl,
    });

    // If network failed but we kept existing paste as ready content, OK.
    // If network succeeded, content comes from network (plan: reingest overwrites from network).
    const source = updateSourceFromIngest(db, id, ingested);
    return Response.json({ source });
  } catch (err) {
    console.error("POST /api/sources/:id/reingest failed", err);
    return apiError("INTERNAL_ERROR", "Failed to reingest source", 500);
  }
}
