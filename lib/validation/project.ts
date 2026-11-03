import { z } from "zod";

export const projectStageSchema = z.enum([
  "sources",
  "research",
  "compose",
]);

export const patchProjectSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    stage: projectStageSchema.optional(),
  })
  .refine((value) => value.title !== undefined || value.stage !== undefined, {
    message: "At least one of title or stage is required",
  });

export type PatchProjectInput = z.infer<typeof patchProjectSchema>;
