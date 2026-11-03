import { apiError } from "@/lib/api/errors";
import {
  findDuplicateUrl,
  getDb,
  getOrCreateCurrent,
  insertSource,
  updateSourceFields,
} from "@/lib/db";
import { ingestSource, normalizeUrl } from "@/lib/ingestion";
import {
  parseMixedInput,
  planMixedIngest,
} from "@/lib/ingestion/parseMixedInput";
import { mixedSourceSchema } from "@/lib/validation/source";
import type { SourceDto } from "@/lib/types/source";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be JSON", 400);
  }

  const parsed = mixedSourceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid mixed source payload", 400, {
      issues: parsed.error.issues,
    });
  }

  const text = parsed.data.text?.trim() ?? "";
  const urlHint = parsed.data.url?.trim() || null;

  const plan = planMixedIngest(parseMixedInput(text, urlHint));
  if (plan.length === 0) {
    return apiError(
      "VALIDATION_ERROR",
      "Could not find text, links, or images to ingest",
      400,
    );
  }

  try {
    const db = getDb();
    const project = getOrCreateCurrent(db);
    const created: SourceDto[] = [];
    const skipped: Array<{ url: string; reason: string }> = [];

    for (const item of plan) {
      if (item.type === "link") {
        let normalized: string;
        try {
          normalized = normalizeUrl(item.url);
        } catch {
          skipped.push({ url: item.url, reason: "invalid_url" });
          continue;
        }
        const dup = findDuplicateUrl(db, project.id, normalized);
        if (dup) {
          skipped.push({ url: normalized, reason: "duplicate" });
          continue;
        }

        const ingested = await ingestSource({
          url: normalized,
          content: item.content,
          imageUrlHint: item.imageUrl,
        });
        created.push(insertSource(db, project.id, ingested));
      } else {
        const ingested = await ingestSource({
          content: item.content,
          imageUrlHint: item.imageUrl,
        });
        created.push(insertSource(db, project.id, ingested));
      }
    }

    if (created.length === 0) {
      return apiError(
        "DUPLICATE_URL",
        "Every link in this paste already exists in the project",
        409,
        { skipped },
      );
    }

    return Response.json(
      {
        sources: created,
        skipped,
        primarySourceId: created[0]!.id,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/sources/mixed failed", err);
    return apiError("INTERNAL_ERROR", "Failed to ingest mixed sources", 500);
  }
}

/** Add URLs mentioned by an existing source as new sources. */
export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be JSON", 400);
  }

  const sourceId =
    typeof body === "object" &&
    body &&
    "sourceId" in body &&
    typeof (body as { sourceId: unknown }).sourceId === "string"
      ? (body as { sourceId: string }).sourceId
      : null;
  const urls =
    typeof body === "object" &&
    body &&
    "urls" in body &&
    Array.isArray((body as { urls: unknown }).urls)
      ? (body as { urls: unknown[] }).urls.filter(
          (u): u is string => typeof u === "string",
        )
      : [];

  if (!sourceId || urls.length === 0) {
    return apiError(
      "VALIDATION_ERROR",
      "Provide sourceId and urls[]",
      400,
    );
  }

  try {
    const db = getDb();
    const project = getOrCreateCurrent(db);
    const created: SourceDto[] = [];
    const skipped: Array<{ url: string; reason: string }> = [];

    for (const raw of urls.slice(0, 15)) {
      let normalized: string;
      try {
        normalized = normalizeUrl(raw);
      } catch {
        skipped.push({ url: raw, reason: "invalid_url" });
        continue;
      }
      if (findDuplicateUrl(db, project.id, normalized)) {
        skipped.push({ url: normalized, reason: "duplicate" });
        continue;
      }
      const ingested = await ingestSource({ url: normalized });
      created.push(insertSource(db, project.id, ingested));
    }

    // Touch parent updatedAt so UI refresh feels consistent
    updateSourceFields(db, sourceId, {});

    return Response.json({ sources: created, skipped });
  } catch (err) {
    console.error("PUT /api/sources/mixed failed", err);
    return apiError("INTERNAL_ERROR", "Failed to add mentioned sources", 500);
  }
}
