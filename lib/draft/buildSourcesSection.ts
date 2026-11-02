import type { SourceDto } from "@/lib/types/source";

/** Deterministic citation list for the draft `sources` section. */
export function buildSourcesSectionContent(sources: SourceDto[]): string {
  const usable = sources.filter(
    (s) => s.status === "ready" && (s.title?.trim() || s.url || s.content.trim()),
  );

  if (usable.length === 0) {
    return "_No ready sources available._";
  }

  return usable
    .map((source, index) => {
      const title = source.title?.trim() || source.url || `Source ${index + 1}`;
      if (source.url) {
        return `- [${title}](${source.url})`;
      }
      return `- ${title}`;
    })
    .join("\n");
}
