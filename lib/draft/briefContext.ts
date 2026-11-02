import type { BriefDto } from "@/lib/types/brief";
import type { DraftSectionDto } from "@/lib/types/draft";
import { listUsableSources, buildSourcesBlock } from "@/lib/research/generateBrief";
import type { SourceDto } from "@/lib/types/source";

export function buildBriefBlock(brief: BriefDto): string {
  const facts = brief.facts.map((f) => `- ${f.text}`).join("\n");
  const analysis = brief.analysis
    .map((a) => `- [${a.kind}] ${a.text}`)
    .join("\n");
  const connections = brief.connections.map((c) => `- ${c.text}`).join("\n");

  return [
    `What happened: ${brief.whatHappened}`,
    `Why it matters: ${brief.whyItMatters}`,
    `Facts:\n${facts}`,
    `Analysis:\n${analysis}`,
    `Connections:\n${connections}`,
  ].join("\n\n");
}

export function buildSiblingsBlock(
  sections: DraftSectionDto[],
  excludeKey: string,
): string {
  return sections
    .filter((s) => s.key !== excludeKey)
    .map((s) => `### ${s.title} (${s.key})\n${s.content}`)
    .join("\n\n");
}

export function cappedSourcesBlock(sources: SourceDto[]): string {
  return buildSourcesBlock(listUsableSources(sources));
}

export function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}
