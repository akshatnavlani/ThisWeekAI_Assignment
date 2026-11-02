import { z } from "zod";
import { PASTE_MAX_CHARS } from "@/lib/ingestion/constants";

export const sourceKindSchema = z.enum(["article", "tweet", "other"]);

export const createSourceSchema = z
  .object({
    url: z.string().trim().optional(),
    title: z.string().trim().max(500).optional(),
    content: z.string().max(PASTE_MAX_CHARS).optional(),
    kind: sourceKindSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const url = value.url?.trim() ?? "";
    const content = value.content?.trim() ?? "";
    if (!url && !content) {
      ctx.addIssue({
        code: "custom",
        message: "Provide a URL and/or pasted content",
        path: ["url"],
      });
    }
    if (url) {
      try {
        // eslint-disable-next-line no-new
        new URL(url);
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Invalid URL",
          path: ["url"],
        });
      }
    }
  });

export const patchSourceSchema = z
  .object({
    url: z.string().trim().optional(),
    title: z.string().trim().max(500).nullable().optional(),
    content: z.string().max(PASTE_MAX_CHARS).optional(),
    kind: sourceKindSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.url === undefined &&
      value.title === undefined &&
      value.content === undefined &&
      value.kind === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message: "At least one field is required",
      });
    }
    if (value.url !== undefined && value.url.trim() !== "") {
      try {
        // eslint-disable-next-line no-new
        new URL(value.url.trim());
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Invalid URL",
          path: ["url"],
        });
      }
    }
  });

export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type PatchSourceInput = z.infer<typeof patchSourceSchema>;
