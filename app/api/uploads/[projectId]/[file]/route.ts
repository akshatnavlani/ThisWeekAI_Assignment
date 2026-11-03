import { apiError } from "@/lib/api/errors";
import {
  mimeForExt,
  resolveUploadFilePath,
} from "@/lib/uploads/paths";
import fs from "node:fs";

type RouteContext = {
  params: Promise<{ projectId: string; file: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { projectId, file } = await context.params;
  const m = file.match(/^([\w-]+)\.([a-z0-9]+)$/i);
  if (!m) {
    return apiError("NOT_FOUND", "Upload not found", 404);
  }
  const sourceId = m[1]!;
  const ext = m[2]!.toLowerCase();
  const mime = mimeForExt(ext);
  if (!mime) {
    return apiError("NOT_FOUND", "Upload not found", 404);
  }

  const resolved = resolveUploadFilePath({ projectId, sourceId, ext });
  if (
    !resolved ||
    !fs.existsSync(/*turbopackIgnore: true*/ resolved.absolutePath)
  ) {
    return apiError("NOT_FOUND", "Upload not found", 404);
  }

  const data = fs.readFileSync(
    /*turbopackIgnore: true*/ resolved.absolutePath,
  );
  return new Response(data, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
