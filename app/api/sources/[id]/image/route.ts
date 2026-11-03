import { apiError } from "@/lib/api/errors";
import { getDb, getSourceById, updateSourceFields } from "@/lib/db";
import {
  ALLOWED_IMAGE_MIME,
  UPLOAD_MAX_BYTES,
  deleteUploadIfLocal,
  ensureUploadsDir,
  extForMime,
  resolveUploadFilePath,
} from "@/lib/uploads/paths";
import fs from "node:fs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const db = getDb();
    const existing = getSourceById(db, id);
    if (!existing) {
      return apiError("NOT_FOUND", "Source not found", 404);
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return apiError("VALIDATION_ERROR", "Expected multipart field `file`", 400);
    }

    const mime = file.type || "application/octet-stream";
    if (!ALLOWED_IMAGE_MIME.has(mime)) {
      return apiError(
        "VALIDATION_ERROR",
        "Only JPEG, PNG, WebP, or GIF images are allowed",
        400,
      );
    }
    if (file.size > UPLOAD_MAX_BYTES) {
      return apiError(
        "VALIDATION_ERROR",
        "Image must be 2 MB or smaller",
        400,
      );
    }

    const ext = extForMime(mime);
    if (!ext) {
      return apiError("VALIDATION_ERROR", "Unsupported image type", 400);
    }

    const resolved = resolveUploadFilePath({
      projectId: existing.projectId,
      sourceId: existing.id,
      ext,
    });
    if (!resolved) {
      return apiError("VALIDATION_ERROR", "Invalid upload path", 400);
    }

    ensureUploadsDir(existing.projectId);
    // Remove previous local upload if extension changed
    if (
      existing.imageUrl?.startsWith("/api/uploads/") &&
      existing.imageUrl !== resolved.publicPath
    ) {
      deleteUploadIfLocal(existing.imageUrl);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(/*turbopackIgnore: true*/ resolved.absolutePath, buffer);

    const source = updateSourceFields(db, id, {
      imageUrl: resolved.publicPath,
    });
    return Response.json({ source });
  } catch (err) {
    console.error("POST /api/sources/:id/image failed", err);
    return apiError("INTERNAL_ERROR", "Failed to upload image", 500);
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

    deleteUploadIfLocal(existing.imageUrl);

    // Prefer restoring og:image from meta when available
    let nextImage: string | null = null;
    if (existing.rawMetaJson) {
      try {
        const meta = JSON.parse(existing.rawMetaJson) as {
          ogImageUrl?: string | null;
        };
        if (meta.ogImageUrl?.trim()) nextImage = meta.ogImageUrl.trim();
      } catch {
        // ignore
      }
    }

    const source = updateSourceFields(db, id, { imageUrl: nextImage });
    return Response.json({ source });
  } catch (err) {
    console.error("DELETE /api/sources/:id/image failed", err);
    return apiError("INTERNAL_ERROR", "Failed to remove image", 500);
  }
}
