import { apiError } from "@/lib/api/errors";
import {
  deleteSource,
  findDuplicateUrl,
  getDb,
  getSourceById,
  isSourceCited,
  updateSourceFields,
  updateSourceFromIngest,
} from "@/lib/db";
import { ingestSource, normalizeUrl } from "@/lib/ingestion";
import { deleteUploadIfLocal } from "@/lib/uploads/paths";
import { patchSourceSchema } from "@/lib/validation/source";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be JSON", 400);
  }

  const parsed = patchSourceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid source update", 400, {
      issues: parsed.error.issues,
    });
  }

  try {
    const db = getDb();
    const existing = getSourceById(db, id);
    if (!existing) {
      return apiError("NOT_FOUND", "Source not found", 404);
    }

    const nextUrlRaw =
      parsed.data.url !== undefined
        ? parsed.data.url.trim() || null
        : existing.url;
    let nextUrl = nextUrlRaw;
    if (parsed.data.url !== undefined && parsed.data.url.trim()) {
      try {
        nextUrl = normalizeUrl(parsed.data.url.trim());
      } catch {
        return apiError("VALIDATION_ERROR", "Invalid URL", 400);
      }
    }

    if (nextUrl) {
      const dup = findDuplicateUrl(db, existing.projectId, nextUrl, id);
      if (dup) {
        return apiError(
          "DUPLICATE_URL",
          "A source with this URL already exists in the project",
          409,
          { existingSourceId: dup.id },
        );
      }
    }

    const urlChanged =
      parsed.data.url !== undefined && nextUrl !== existing.url;
    const pasteProvided = parsed.data.content !== undefined;
    const kind = parsed.data.kind ?? (existing.kind as "article" | "tweet" | "other");

    // Paste recovery / content edit without URL change — do not re-fetch (sites may 403).
    if (pasteProvided && !urlChanged) {
      const trimmed = (parsed.data.content ?? "").trim();
      if (!trimmed) {
        return apiError(
          "VALIDATION_ERROR",
          "Paste some content before saving recovery",
          400,
        );
      }

      let title =
        parsed.data.title !== undefined
          ? parsed.data.title
          : existing.title;
      if (!title?.trim()) {
        const firstLine = trimmed
          .split(/\n/)
          .map((l) => l.trim())
          .find((l) => l.length > 0);
        if (
          firstLine &&
          firstLine.length <= 120 &&
          !/^https?:\/\//i.test(firstLine)
        ) {
          title = firstLine;
        }
      }

      const source = updateSourceFields(db, id, {
        content: trimmed,
        title: title ?? existing.title,
        kind,
        status: "ready",
        modality: nextUrl ? "url_and_paste" : "paste",
        errorMessage: null,
        url: nextUrl,
      });
      return Response.json({ source });
    }

    // Full re-ingest when URL changes (optional paste travels with it)
    if (urlChanged) {
      const ingested = await ingestSource({
        url: nextUrl,
        title:
          parsed.data.title !== undefined
            ? parsed.data.title
            : existing.title,
        content:
          parsed.data.content !== undefined
            ? parsed.data.content
            : undefined,
        kind,
        existingContent:
          !pasteProvided && existing.content.trim()
            ? existing.content
            : undefined,
        existingImageUrl: existing.imageUrl,
      });

      const source = updateSourceFromIngest(
        db,
        id,
        ingested,
        parsed.data.title !== undefined ? parsed.data.title : undefined,
      );
      return Response.json({ source });
    }

    // Title-only (or kind-only) update
    const source = updateSourceFields(db, id, {
      title:
        parsed.data.title !== undefined ? parsed.data.title : existing.title,
      kind: parsed.data.kind ?? existing.kind,
    });
    return Response.json({ source });
  } catch (err) {
    console.error("PATCH /api/sources/:id failed", err);
    return apiError("INTERNAL_ERROR", "Failed to update source", 500);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const db = getDb();
    const existing = getSourceById(db, id);
    if (!existing) {
      return apiError("NOT_FOUND", "Source not found", 404);
    }
    if (isSourceCited(db, id)) {
      return apiError(
        "SOURCE_CITED",
        "Source is cited in the research brief and cannot be deleted",
        409,
      );
    }
    deleteUploadIfLocal(existing.imageUrl);
    deleteSource(db, id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/sources/:id failed", err);
    return apiError("INTERNAL_ERROR", "Failed to delete source", 500);
  }
}
