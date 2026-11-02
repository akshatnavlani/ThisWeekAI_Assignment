import { z } from "zod";

export const geminiWritingSuggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        index: z.number().int().nonnegative(),
        explanation: z.string().trim().min(1),
        rewrite: z.string(),
      }),
    )
    .min(1),
});

export type GeminiWritingSuggestions = z.infer<
  typeof geminiWritingSuggestionsSchema
>;
