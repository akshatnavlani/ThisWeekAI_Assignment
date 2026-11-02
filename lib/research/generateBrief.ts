import type { AppDb } from "@/lib/db/client";
import { replaceBriefGraph } from "@/lib/db/repos/research";
import { listSourcesByProject, type SourceDto } from "@/lib/db/repos/sources";
import {
  createGeminiJsonGenerator,
  LlmRateLimitError,
  LlmSetupError,
  type GenerateJsonFn,
} from "@/lib/llm/client";
import {
  buildBriefSystemInstruction,
  buildBriefUserPrompt,
} from "@/lib/llm/prompts/brief";
import {
  geminiBriefSchema,
  type GeminiBrief,
} from "@/lib/llm/schemas/brief";
import type { BriefDto } from "@/lib/types/brief";
import { sanitizeBriefSourceIds } from "./validateSourceIds";

export class NeedsSourcesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NeedsSourcesError";
  }
}

export class LlmOutputInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmOutputInvalidError";
  }
}

const MAX_SOURCE_CHARS = 1800;
const MAX_TOTAL_CHARS = 6000;

export function listUsableSources(sources: SourceDto[]): SourceDto[] {
  return sources.filter(
    (s) => s.status === "ready" && s.content.trim().length > 0,
  );
}

export function buildSourcesBlock(sources: SourceDto[]): string {
  let remaining = MAX_TOTAL_CHARS;
  const parts: string[] = [];
  for (const source of sources) {
    if (remaining <= 0) break;
    const body = source.content.trim().slice(0, Math.min(MAX_SOURCE_CHARS, remaining));
    remaining -= body.length;
    parts.push(
      [
        `id: ${source.id}`,
        `title: ${source.title ?? "(untitled)"}`,
        `url: ${source.url ?? "(none)"}`,
        `content: ${body}`,
      ].join("\n"),
    );
  }
  return parts.join("\n\n---\n\n");
}

function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function parseAndSanitize(
  raw: string,
  allowedIds: string[],
): { ok: true; brief: GeminiBrief } | { ok: false; issues: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonText(raw));
  } catch {
    return { ok: false, issues: ["Response was not valid JSON"] };
  }

  const schema = geminiBriefSchema.safeParse(parsed);
  if (!schema.success) {
    return {
      ok: false,
      issues: schema.error.issues.map(
        (i) => `${i.path.join(".") || "root"}: ${i.message}`,
      ),
    };
  }

  const sanitized = sanitizeBriefSourceIds(schema.data, allowedIds);
  if (!sanitized.ok) {
    return { ok: false, issues: sanitized.issues };
  }

  // Re-check min(1) sourceIds after sanitize via schema
  const again = geminiBriefSchema.safeParse(sanitized.brief);
  if (!again.success) {
    return {
      ok: false,
      issues: again.error.issues.map(
        (i) => `${i.path.join(".") || "root"}: ${i.message}`,
      ),
    };
  }

  return { ok: true, brief: again.data };
}

export async function generateBriefForProject(
  db: AppDb,
  projectId: string,
  deps: { generateJson?: GenerateJsonFn } = {},
): Promise<BriefDto> {
  const sources = listUsableSources(listSourcesByProject(db, projectId));
  if (sources.length < 3) {
    throw new NeedsSourcesError(
      `Need at least 3 ready sources with content (have ${sources.length}).`,
    );
  }

  const allowedIds = sources.map((s) => s.id);
  const generateJson = deps.generateJson ?? createGeminiJsonGenerator();
  const systemInstruction = buildBriefSystemInstruction();
  const sourcesBlock = buildSourcesBlock(sources);

  let repairHint: string | undefined;
  let lastIssues: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    const userPrompt = buildBriefUserPrompt({
      sourcesBlock,
      allowedSourceIds: allowedIds,
      repairHint,
    });

    let raw: string;
    try {
      raw = await generateJson({ systemInstruction, userPrompt });
    } catch (err) {
      if (err instanceof LlmSetupError || err instanceof LlmRateLimitError) {
        throw err;
      }
      throw err;
    }

    const result = parseAndSanitize(raw, allowedIds);
    if (result.ok) {
      return replaceBriefGraph(db, projectId, result.brief);
    }

    lastIssues = result.issues;
    repairHint = result.issues.join("; ");
  }

  throw new LlmOutputInvalidError(
    `Model output invalid after retry: ${lastIssues.join("; ")}`,
  );
}

export { LlmRateLimitError, LlmSetupError };
