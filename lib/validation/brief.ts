import { z } from "zod";

const factSchema = z.object({
  text: z.string().trim().min(1),
  sourceIds: z.array(z.string().min(1)).min(1),
});

const analysisSchema = z.object({
  text: z.string().trim().min(1),
  kind: z.enum(["analysis", "speculation"]),
  sourceIds: z.array(z.string().min(1)).min(1),
});

const connectionSchema = z.object({
  text: z.string().trim().min(1),
  sourceIds: z.array(z.string().min(1)).min(1),
});

const angleSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
});

export const patchBriefSchema = z
  .object({
    whatHappened: z.string().trim().min(1).optional(),
    whyItMatters: z.string().trim().min(1).optional(),
    facts: z.array(factSchema).min(1).optional(),
    analysis: z.array(analysisSchema).min(1).optional(),
    connections: z.array(connectionSchema).min(1).optional(),
    angles: z.array(angleSchema).min(1).optional(),
  })
  .refine(
    (value) =>
      value.whatHappened !== undefined ||
      value.whyItMatters !== undefined ||
      value.facts !== undefined ||
      value.analysis !== undefined ||
      value.connections !== undefined ||
      value.angles !== undefined,
    { message: "At least one brief field is required" },
  );

export type PatchBriefInput = z.infer<typeof patchBriefSchema>;
