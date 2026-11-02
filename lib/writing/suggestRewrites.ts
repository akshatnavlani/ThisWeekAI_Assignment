import {
  createGeminiJsonGenerator,
  LlmRateLimitError,
  LlmSetupError,
  type GenerateJsonFn,
} from "@/lib/llm/client";
import {
  buildWritingSystemInstruction,
  buildWritingUserPrompt,
} from "@/lib/llm/prompts/writing";
import { geminiWritingSuggestionsSchema } from "@/lib/llm/schemas/writing";
import { LlmOutputInvalidError } from "@/lib/research/generateBrief";
import type { DetectedIssue } from "@/lib/types/writing";
import { extractJsonText } from "@/lib/draft/briefContext";

export type SuggestedRewrite = DetectedIssue & {
  explanation: string;
  rewrite: string;
};

function parseSuggestions(
  raw: string,
  spanCount: number,
):
  | { ok: true; byIndex: Map<number, { explanation: string; rewrite: string }> }
  | { ok: false; issues: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonText(raw));
  } catch {
    return { ok: false, issues: ["Response was not valid JSON"] };
  }

  const schema = geminiWritingSuggestionsSchema.safeParse(parsed);
  if (!schema.success) {
    return {
      ok: false,
      issues: schema.error.issues.map(
        (i) => `${i.path.join(".") || "root"}: ${i.message}`,
      ),
    };
  }

  const byIndex = new Map<number, { explanation: string; rewrite: string }>();
  for (const item of schema.data.suggestions) {
    if (item.index < 0 || item.index >= spanCount) {
      return {
        ok: false,
        issues: [`index ${item.index} out of range (0..${spanCount - 1})`],
      };
    }
    byIndex.set(item.index, {
      explanation: item.explanation,
      rewrite: item.rewrite,
    });
  }

  for (let i = 0; i < spanCount; i++) {
    if (!byIndex.has(i)) {
      return { ok: false, issues: [`Missing suggestion for index ${i}`] };
    }
  }

  return { ok: true, byIndex };
}

export async function suggestRewrites(
  issues: DetectedIssue[],
  deps: { generateJson?: GenerateJsonFn } = {},
): Promise<SuggestedRewrite[]> {
  if (issues.length === 0) return [];

  const generateJson = deps.generateJson ?? createGeminiJsonGenerator();
  const systemInstruction = buildWritingSystemInstruction();
  const spans = issues.map((issue, index) => ({
    index,
    category: issue.category,
    passage: issue.passage,
  }));

  let repairHint: string | undefined;
  let lastIssues: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    const userPrompt = buildWritingUserPrompt({ spans, repairHint });
    let raw: string;
    try {
      raw = await generateJson({ systemInstruction, userPrompt });
    } catch (err) {
      if (err instanceof LlmSetupError || err instanceof LlmRateLimitError) {
        throw err;
      }
      throw err;
    }

    const result = parseSuggestions(raw, issues.length);
    if (result.ok) {
      return issues.map((issue, index) => {
        const suggestion = result.byIndex.get(index)!;
        return {
          ...issue,
          explanation: suggestion.explanation,
          rewrite: suggestion.rewrite.trim() || issue.passage,
        };
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
