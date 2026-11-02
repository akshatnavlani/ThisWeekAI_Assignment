import type { GeminiBrief } from "@/lib/llm/schemas/brief";

export type SourceIdValidationResult = {
  ok: boolean;
  brief: GeminiBrief;
  issues: string[];
};

function filterIds(ids: string[], allowed: Set<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Strip unknown sourceIds; collect issues for items left with none. */
export function sanitizeBriefSourceIds(
  brief: GeminiBrief,
  allowedSourceIds: Iterable<string>,
): SourceIdValidationResult {
  const allowed = new Set(allowedSourceIds);
  const issues: string[] = [];

  const facts = brief.facts.map((item, index) => {
    const sourceIds = filterIds(item.sourceIds, allowed);
    if (sourceIds.length === 0) {
      issues.push(`facts[${index}] has no valid sourceIds`);
    }
    return { ...item, sourceIds };
  });

  const analysis = brief.analysis.map((item, index) => {
    const sourceIds = filterIds(item.sourceIds, allowed);
    if (sourceIds.length === 0) {
      issues.push(`analysis[${index}] has no valid sourceIds`);
    }
    return { ...item, sourceIds };
  });

  const connections = brief.connections.map((item, index) => {
    const sourceIds = filterIds(item.sourceIds, allowed);
    if (sourceIds.length === 0) {
      issues.push(`connections[${index}] has no valid sourceIds`);
    }
    return { ...item, sourceIds };
  });

  const next: GeminiBrief = {
    ...brief,
    facts,
    analysis,
    connections,
  };

  return {
    ok: issues.length === 0,
    brief: next,
    issues,
  };
}
