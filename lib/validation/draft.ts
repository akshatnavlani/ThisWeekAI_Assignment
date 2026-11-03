import { z } from "zod";

export const generateDraftBodySchema = z.object({
  mode: z.literal("starter_draft"),
  angleId: z.string().trim().min(1),
  angleOverride: z.string().trim().min(1).optional(),
});

export const blankDraftBodySchema = z.object({
  angleId: z.string().trim().min(1),
});

export const changeAngleBodySchema = z.object({
  angleId: z.string().trim().min(1),
});

export const createDraftSectionBodySchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    purpose: z.string().trim().max(500).optional(),
    generate: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.generate && !(value.purpose && value.purpose.trim().length > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Purpose is required when generating a section",
        path: ["purpose"],
      });
    }
  });

export const reorderDraftSectionsBodySchema = z.object({
  orderedKeys: z.array(z.string().trim().min(1)).min(1),
});

export const patchDraftSectionBodySchema = z
  .object({
    content: z.string().optional(),
    title: z.string().trim().min(1).max(120).optional(),
    purpose: z.string().trim().min(1).max(500).optional(),
  })
  .refine(
    (v) =>
      v.content !== undefined ||
      v.title !== undefined ||
      v.purpose !== undefined,
    { message: "Provide content, title, and/or purpose" },
  );
