import { z } from "zod";

export const generateDraftBodySchema = z.object({
  mode: z.enum(["starter_draft", "outline_only"]),
  angleId: z.string().trim().min(1),
  angleOverride: z.string().trim().min(1).optional(),
});

export const patchDraftSectionBodySchema = z.object({
  content: z.string(),
});
