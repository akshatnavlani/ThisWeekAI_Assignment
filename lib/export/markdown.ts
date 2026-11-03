/** Trigger a browser download of a text file. */
export function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/markdown;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard API unavailable");
  }
  await navigator.clipboard.writeText(text);
}

export function briefToMarkdown(brief: {
  whatHappened: string;
  whyItMatters: string;
  angles: Array<{ title: string; description: string }>;
  claims?: Array<{ claimText: string; claimType: string }>;
}): string {
  const lines: string[] = [
    "# Research brief",
    "",
    "## What happened",
    "",
    brief.whatHappened.trim() || "_(empty)_",
    "",
    "## Why it matters",
    "",
    brief.whyItMatters.trim() || "_(empty)_",
    "",
    "## Angles",
    "",
  ];
  for (const angle of brief.angles) {
    lines.push(`### ${angle.title}`, "", angle.description.trim(), "");
  }
  if (brief.claims?.length) {
    lines.push("## Claims", "");
    for (const c of brief.claims) {
      lines.push(`- (${c.claimType}) ${c.claimText}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
