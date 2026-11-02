export type SentenceSpan = {
  text: string;
  startOffset: number;
  endOffset: number;
};

/** Split working_plain into sentences with absolute offsets; skip markdown headings. */
export function splitSentences(text: string): SentenceSpan[] {
  const results: SentenceSpan[] = [];
  const lines = text.split("\n");
  let offset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineStart = offset;
    const isHeading = /^#{1,6}\s/.test(line);
    offset += line.length;
    if (i < lines.length - 1) offset += 1; // newline

    if (isHeading || !line.trim()) continue;

    const sentenceRegex = /[^.!?]+[.!?]+|[^.!?]+$/g;
    let match: RegExpExecArray | null;
    while ((match = sentenceRegex.exec(line)) !== null) {
      const raw = match[0];
      const leading = raw.match(/^\s*/)?.[0].length ?? 0;
      const trailing = raw.match(/\s*$/)?.[0].length ?? 0;
      const start = lineStart + match.index + leading;
      const end = lineStart + match.index + raw.length - trailing;
      const trimmed = text.slice(start, end);
      if (!trimmed.trim()) continue;
      results.push({ text: trimmed, startOffset: start, endOffset: end });
    }
  }

  return results;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
