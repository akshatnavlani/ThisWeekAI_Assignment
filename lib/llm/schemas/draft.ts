import { z } from "zod";
import { PROSE_SECTION_KEYS, slugifySectionKey } from "@/lib/types/draft";

export const geminiDraftSectionSchema = z.object({
  key: z.string().trim().min(1),
  title: z.string().trim().min(1),
  purpose: z.string().trim().optional(),
  content: z.string().trim().min(1),
});

/** Model may return prose sections only; `sources` is filled server-side. */
export const geminiDraftSchema = z.object({
  sections: z.array(geminiDraftSectionSchema).min(1),
});

export type GeminiDraft = z.infer<typeof geminiDraftSchema>;

export const geminiSectionRegenSchema = z.object({
  key: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
});

export type GeminiSectionRegen = z.infer<typeof geminiSectionRegenSchema>;

export function normalizeDraftSections(
  parsed: GeminiDraft,
):
  | {
      ok: true;
      sections: Array<{
        key: string;
        title: string;
        purpose: string;
        content: string;
      }>;
    }
  | { ok: false; issues: string[] } {
  const seen = new Set<string>();
  const issues: string[] = [];
  const ordered: Array<{
    key: string;
    title: string;
    purpose: string;
    content: string;
  }> = [];

  for (const section of parsed.sections) {
    let key = section.key.trim() || slugifySectionKey(section.title);
    // Sources list is always filled server-side — ignore model copy
    if (key === "sources") continue;
    if (seen.has(key)) {
      key = `${key}_${ordered.length}`;
    }
    seen.add(key);
    ordered.push({
      key,
      title: section.title,
      purpose: section.purpose?.trim() || "",
      content: section.content,
    });
  }

  // Prefer classic starter shape when model uses those keys — ensure headline present
  const hasHeadline = ordered.some(
    (s) => s.key === "headline" || s.title.toLowerCase() === "headline",
  );
  if (!hasHeadline) {
    issues.push("Missing headline section");
  }

  // Soft preference: if model returns classic keys, require all prose keys
  const classicKeys = ordered.every((s) =>
    (PROSE_SECTION_KEYS as readonly string[]).includes(s.key),
  );
  if (classicKeys && ordered.length >= 3) {
    for (const key of PROSE_SECTION_KEYS) {
      if (!ordered.some((s) => s.key === key)) {
        issues.push(`Missing section: ${key}`);
      }
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  // Stable order for classic keys
  const byKey = new Map(ordered.map((s) => [s.key, s]));
  if (PROSE_SECTION_KEYS.every((k) => byKey.has(k))) {
    return {
      ok: true,
      sections: PROSE_SECTION_KEYS.map((k) => byKey.get(k)!),
    };
  }

  return { ok: true, sections: ordered };
}
