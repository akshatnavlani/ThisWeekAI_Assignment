import fs from "node:fs";
import path from "node:path";
import { resolveDatabasePath } from "@/lib/db/client";

export const UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function uploadsRoot(databasePath?: string): string {
  const dbPath = resolveDatabasePath(databasePath);
  return path.join(path.dirname(dbPath), "uploads");
}

export function ensureUploadsDir(
  projectId: string,
  databasePath?: string,
): string {
  const dir = path.join(uploadsRoot(databasePath), projectId);
  fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
  return dir;
}

export function extForMime(mime: string): string | null {
  return EXT_BY_MIME[mime] ?? null;
}

export function mimeForExt(ext: string): string | null {
  const normalized = ext.replace(/^\./, "").toLowerCase();
  for (const [mime, e] of Object.entries(EXT_BY_MIME)) {
    if (e === normalized) return mime;
  }
  return null;
}

/**
 * Resolve a safe absolute path under uploads/{projectId}/{sourceId}.{ext}.
 * Rejects path traversal.
 */
export function resolveUploadFilePath(args: {
  projectId: string;
  sourceId: string;
  ext: string;
  databasePath?: string;
}): { absolutePath: string; publicPath: string } | null {
  const { projectId, sourceId, ext, databasePath } = args;
  if (
    !/^[\w-]+$/.test(projectId) ||
    !/^[\w-]+$/.test(sourceId) ||
    !/^[a-z0-9]+$/i.test(ext)
  ) {
    return null;
  }

  const root = path.resolve(uploadsRoot(databasePath));
  const absolutePath = path.resolve(
    root,
    projectId,
    `${sourceId}.${ext.toLowerCase()}`,
  );
  if (!absolutePath.startsWith(root + path.sep) && absolutePath !== root) {
    return null;
  }

  return {
    absolutePath,
    publicPath: `/api/uploads/${projectId}/${sourceId}.${ext.toLowerCase()}`,
  };
}

export function parseUploadPublicPath(
  publicPath: string,
): { projectId: string; sourceId: string; ext: string } | null {
  const m = publicPath.match(
    /^\/api\/uploads\/([\w-]+)\/([\w-]+)\.([a-z0-9]+)$/i,
  );
  if (!m) return null;
  return { projectId: m[1]!, sourceId: m[2]!, ext: m[3]!.toLowerCase() };
}

export function deleteUploadIfLocal(
  imageUrl: string | null | undefined,
  databasePath?: string,
): void {
  if (!imageUrl?.startsWith("/api/uploads/")) return;
  const parsed = parseUploadPublicPath(imageUrl);
  if (!parsed) return;
  const resolved = resolveUploadFilePath({ ...parsed, databasePath });
  if (!resolved) return;
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ resolved.absolutePath)) {
      fs.unlinkSync(/*turbopackIgnore: true*/ resolved.absolutePath);
    }
  } catch {
    // best-effort
  }
}

/** Best-effort remove of uploads/{projectId}/ when starting a new project. */
export function deleteProjectUploadsDir(
  projectId: string,
  databasePath?: string,
): void {
  const dir = path.join(uploadsRoot(databasePath), projectId);
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ dir)) {
      fs.rmSync(/*turbopackIgnore: true*/ dir, { recursive: true, force: true });
    }
  } catch {
    // best-effort
  }
}
