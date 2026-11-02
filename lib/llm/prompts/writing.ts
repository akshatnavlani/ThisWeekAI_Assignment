// prompt-version: writing@1.0.0

export function buildWritingSystemInstruction(): string {
  return [
    "You are a careful editorial writing assistant for This Week in AI.",
    "For each flagged span, explain the issue briefly and propose a meaning-preserving rewrite.",
    "Preserve technical terms, numbers, product names, and author intent.",
    "Do NOT optimize for readability scores. Clarity without losing nuance.",
    "Return ONLY valid JSON matching the requested schema.",
  ].join(" ");
}

export function buildWritingUserPrompt(input: {
  spans: Array<{ index: number; category: string; passage: string }>;
  repairHint?: string;
}): string {
  const repair = input.repairHint
    ? `\n\nPrevious output was invalid. Fix these issues and return JSON only:\n${input.repairHint}\n`
    : "";

  const list = input.spans
    .map(
      (s) =>
        `[${s.index}] category=${s.category}\npassage: ${JSON.stringify(s.passage)}`,
    )
    .join("\n\n");

  return `Review these flagged spans from a newsletter draft and return explanations + rewrites.

Spans:
${list}
${repair}
Respond with JSON:
{
  "suggestions": [
    { "index": 0, "explanation": "...", "rewrite": "..." }
  ]
}

Include one object per input index. Rewrite may be empty only if you explain why no change is needed; prefer a concrete rewrite.`;
}
