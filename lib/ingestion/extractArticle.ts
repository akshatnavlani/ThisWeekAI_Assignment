import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

export type ExtractedArticle = {
  title: string | null;
  textContent: string;
  excerpt: string | null;
};

export function extractArticle(
  html: string,
  pageUrl: string,
): ExtractedArticle | null {
  const { document } = parseHTML(html);
  // Readability uses document URI for relative links when available
  try {
    Object.defineProperty(document, "documentURI", {
      value: pageUrl,
      configurable: true,
    });
  } catch {
    // ignore if not configurable
  }

  const reader = new Readability(document as unknown as Document);
  const article = reader.parse();
  if (!article) return null;

  const text = (article.textContent ?? "").replace(/\s+\n/g, "\n").trim();
  if (!text) return null;

  return {
    title: article.title?.trim() || null,
    textContent: text,
    excerpt: article.excerpt?.trim() || null,
  };
}
