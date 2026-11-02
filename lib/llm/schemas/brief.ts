import { z } from "zod";

export const geminiBriefSchema = z.object({
  whatHappened: z.string().trim().min(1),
  whyItMatters: z.string().trim().min(1),
  facts: z
    .array(
      z.object({
        text: z.string().trim().min(1),
        sourceIds: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1),
  analysis: z
    .array(
      z.object({
        text: z.string().trim().min(1),
        kind: z.enum(["analysis", "speculation"]),
        sourceIds: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1),
  connections: z
    .array(
      z.object({
        text: z.string().trim().min(1),
        sourceIds: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1),
  angles: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        description: z.string().trim().min(1),
      }),
    )
    .min(1),
});

export type GeminiBrief = z.infer<typeof geminiBriefSchema>;
