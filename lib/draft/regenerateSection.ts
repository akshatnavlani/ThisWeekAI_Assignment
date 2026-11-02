import type { AppDb } from "@/lib/db/client";
import {
  getDraftByProject,
  updateDraftSection,
} from "@/lib/db/repos/drafts";
import { getBriefByProject } from "@/lib/db/repos/research";
import { listSourcesByProject } from "@/lib/db/repos/sources";
import {
  createGeminiJsonGenerator,
  LlmRateLimitError,
  LlmSetupError,
  type GenerateJsonFn,
} from "@/lib/llm/client";
import {
  buildSectionRegenSystemInstruction,
  buildSectionRegenUserPrompt,
} from "@/lib/llm/prompts/draft";
import { geminiSectionRegenSchema } from "@/lib/llm/schemas/draft";
import { LlmOutputInvalidError } from "@/lib/research/generateBrief";
import type { DraftDto, DraftSectionKey } from "@/lib/types/draft";
import { DRAFT_SECTION_TITLES } from "@/lib/types/draft";
import { buildSourcesSectionContent } from "./buildSourcesSection";
import {
  buildBriefBlock,
  buildSiblingsBlock,
  extractJsonText,
} from "./briefContext";
import { InvalidAngleError, NeedsBriefError } from "./generateDraft";

export class NeedsDraftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NeedsDraftError";
  }
}

function parseSectionOutput(
  raw: string,
  expectedKey: DraftSectionKey,
):
  | { ok: true; content: string; title: string }
  | { ok: false; issues: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonText(raw));
  } catch {
    return { ok: false, issues: ["Response was not valid JSON"] };
  }

  const schema = geminiSectionRegenSchema.safeParse(parsed);
  if (!schema.success) {
    return {
      ok: false,
      issues: schema.error.issues.map(
        (i) => `${i.path.join(".") || "root"}: ${i.message}`,
      ),
    };
  }

  if (schema.data.key !== expectedKey) {
    return {
      ok: false,
      issues: [`Expected key ${expectedKey}, got ${schema.data.key}`],
    };
  }

  return {
    ok: true,
    content: schema.data.content,
    title: schema.data.title,
  };
}

export async function regenerateDraftSection(
  db: AppDb,
  projectId: string,
  sectionKey: DraftSectionKey,
  deps: { generateJson?: GenerateJsonFn } = {},
): Promise<DraftDto> {
  const draft = getDraftByProject(db, projectId);
  if (!draft) {
    throw new NeedsDraftError("Generate a draft before regenerating a section.");
  }

  if (sectionKey === "sources") {
    const sources = listSourcesByProject(db, projectId);
    const content = buildSourcesSectionContent(sources);
    const updated = updateDraftSection(db, projectId, "sources", content);
    if (!updated) {
      throw new NeedsDraftError("Draft disappeared while refreshing citations.");
    }
    return updated;
  }

  const brief = getBriefByProject(db, projectId);
  if (!brief || brief.angles.length < 1) {
    throw new NeedsBriefError(
      "Research brief with angles is required to regenerate a section.",
    );
  }

  const angle =
    (draft.selectedAngleId
      ? brief.angles.find((a) => a.id === draft.selectedAngleId)
      : undefined) ?? brief.angles[0];

  if (!angle) {
    throw new InvalidAngleError("No newsletter angle available for regeneration.");
  }

  const generateJson = deps.generateJson ?? createGeminiJsonGenerator();
  const systemInstruction = buildSectionRegenSystemInstruction();
  const briefBlock = buildBriefBlock(brief);
  const siblingsBlock = buildSiblingsBlock(draft.sections, sectionKey);
  const sectionTitle = DRAFT_SECTION_TITLES[sectionKey];

  let repairHint: string | undefined;
  let lastIssues: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    const userPrompt = buildSectionRegenUserPrompt({
      sectionKey,
      sectionTitle,
      angleTitle: angle.title,
      angleDescription: angle.description,
      briefBlock,
      siblingsBlock,
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

    const result = parseSectionOutput(raw, sectionKey);
    if (result.ok) {
      const updated = updateDraftSection(
        db,
        projectId,
        sectionKey,
        result.content,
      );
      if (!updated) {
        throw new NeedsDraftError("Draft disappeared while regenerating section.");
      }
      return updated;
    }

    lastIssues = result.issues;
    repairHint = result.issues.join("; ");
  }

  throw new LlmOutputInvalidError(
    `Model output invalid after retry: ${lastIssues.join("; ")}`,
  );
}

export { LlmOutputInvalidError, LlmRateLimitError, LlmSetupError };
