import { z } from "zod";
import { PROSE_SECTION_KEYS } from "@/lib/types/draft";

const proseKeySchema = z.enum(PROSE_SECTION_KEYS);

export const geminiDraftSectionSchema = z.object({
  key: proseKeySchema,
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
});

/** Model may return prose sections only; `sources` is filled server-side. */
export const geminiDraftSchema = z.object({
  sections: z.array(geminiDraftSectionSchema).min(1),
});

export type GeminiDraft = z.infer<typeof geminiDraftSchema>;

export const geminiSectionRegenSchema = z.object({
  key: proseKeySchema,
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
});

export type GeminiSectionRegen = z.infer<typeof geminiSectionRegenSchema>;

export function normalizeDraftSections(
  parsed: GeminiDraft,
): { ok: true; sections: GeminiDraft["sections"] } | { ok: false; issues: string[] } {
  const byKey = new Map<string, (typeof parsed.sections)[number]>();
  for (const section of parsed.sections) {
    byKey.set(section.key, section);
  }

  const issues: string[] = [];
  const ordered: GeminiDraft["sections"] = [];
  for (const key of PROSE_SECTION_KEYS) {
    const found = byKey.get(key);
    if (!found) {
      issues.push(`Missing section: ${key}`);
      continue;
    }
    ordered.push(found);
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, sections: ordered };
}
