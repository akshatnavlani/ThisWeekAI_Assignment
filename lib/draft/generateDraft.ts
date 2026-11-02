import type { AppDb } from "@/lib/db/client";
import { replaceDraftGraph } from "@/lib/db/repos/drafts";
import { getBriefByProject } from "@/lib/db/repos/research";
import { listSourcesByProject } from "@/lib/db/repos/sources";
import {
  createGeminiJsonGenerator,
  LlmRateLimitError,
  LlmSetupError,
  type GenerateJsonFn,
} from "@/lib/llm/client";
import {
  buildDraftSystemInstruction,
  buildDraftUserPrompt,
} from "@/lib/llm/prompts/draft";
import {
  geminiDraftSchema,
  normalizeDraftSections,
} from "@/lib/llm/schemas/draft";
import type { DraftDto, DraftMode } from "@/lib/types/draft";
import { LlmOutputInvalidError } from "@/lib/research/generateBrief";
import { buildSourcesSectionContent } from "./buildSourcesSection";
import {
  buildBriefBlock,
  cappedSourcesBlock,
  extractJsonText,
} from "./briefContext";

export class NeedsBriefError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NeedsBriefError";
  }
}

export class InvalidAngleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAngleError";
  }
}

export type GenerateDraftInput = {
  mode: Extract<DraftMode, "starter_draft" | "outline_only">;
  angleId: string;
  angleOverride?: string;
};

function parseDraftOutput(
  raw: string,
):
  | { ok: true; sections: { key: "headline" | "what_happened" | "context" | "analysis" | "implication"; title: string; content: string }[] }
  | { ok: false; issues: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonText(raw));
  } catch {
    return { ok: false, issues: ["Response was not valid JSON"] };
  }

  const schema = geminiDraftSchema.safeParse(parsed);
  if (!schema.success) {
    return {
      ok: false,
      issues: schema.error.issues.map(
        (i) => `${i.path.join(".") || "root"}: ${i.message}`,
      ),
    };
  }

  const normalized = normalizeDraftSections(schema.data);
  if (!normalized.ok) {
    return normalized;
  }
  return { ok: true, sections: normalized.sections };
}

export async function generateDraftForProject(
  db: AppDb,
  projectId: string,
  input: GenerateDraftInput,
  deps: { generateJson?: GenerateJsonFn } = {},
): Promise<DraftDto> {
  const brief = getBriefByProject(db, projectId);
  if (!brief || brief.angles.length < 1) {
    throw new NeedsBriefError(
      "Generate a research brief with at least one newsletter angle first.",
    );
  }

  const angle = brief.angles.find((a) => a.id === input.angleId);
  if (!angle) {
    throw new InvalidAngleError(
      "Selected angle does not belong to the current research brief.",
    );
  }

  const angleTitle = input.angleOverride?.trim() || angle.title;
  const angleDescription = angle.description;
  const sources = listSourcesByProject(db, projectId);
  const generateJson = deps.generateJson ?? createGeminiJsonGenerator();
  const systemInstruction = buildDraftSystemInstruction(input.mode);
  const briefBlock = buildBriefBlock(brief);
  const sourcesBlock = cappedSourcesBlock(sources);

  let repairHint: string | undefined;
  let lastIssues: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    const userPrompt = buildDraftUserPrompt({
      mode: input.mode,
      angleTitle,
      angleDescription,
      briefBlock,
      sourcesBlock,
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

    const result = parseDraftOutput(raw);
    if (result.ok) {
      const sourcesContent = buildSourcesSectionContent(sources);
      return replaceDraftGraph(db, projectId, {
        mode: input.mode,
        selectedAngleId: input.angleId,
        sections: [
          ...result.sections.map((s) => ({
            key: s.key,
            content: s.content,
          })),
          { key: "sources" as const, content: sourcesContent },
        ],
        setSnapshotIfFirstStarter: true,
      });
    }

    lastIssues = result.issues;
    repairHint = result.issues.join("; ");
  }

  throw new LlmOutputInvalidError(
    `Model output invalid after retry: ${lastIssues.join("; ")}`,
  );
}

export { LlmOutputInvalidError, LlmRateLimitError, LlmSetupError };
