import { isHeadlineSection } from "@/lib/types/draft";

/**
 * Strip leading headings that duplicate section chrome / workingPlain wrappers.
 */
export function normalizeSectionContent(
  key: string,
  content: string,
  title = "",
): string {
  let text = content.trim();
  const label = title.trim() || key;
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const dupHeading = new RegExp(
    `^(?:#{1,3}\\s*${escaped}\\s*\\n+)+`,
    "i",
  );
  text = text.replace(dupHeading, "");

  if (isHeadlineSection({ key, title: label })) {
    text = text.replace(/^#{1,3}\s+/, "").trim();
  }

  return text.trim();
}
