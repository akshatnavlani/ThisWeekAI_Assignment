// prompt-version: brief@1.0.0

export function buildBriefSystemInstruction(): string {
  return [
    "You are a research editor for This Week in AI.",
    "Return ONLY valid JSON matching the requested schema.",
    "Audience: founders, builders, and business operators.",
    "Separate verifiable facts from analysis/speculation.",
    "Every fact, analysis, and connection item MUST include sourceIds drawn ONLY from the provided source id list.",
    "Never invent URLs or source ids. Prefer multiple newsletter angles (at least one).",
    "Highlight cross-source connections that could become a story.",
  ].join(" ");
}

export function buildBriefUserPrompt(input: {
  sourcesBlock: string;
  allowedSourceIds: string[];
  repairHint?: string;
}): string {
  const repair = input.repairHint
    ? `\n\nPrevious output was invalid. Fix these issues and return JSON only:\n${input.repairHint}\n`
    : "";

  return `Build a structured research brief from these sources.

Allowed sourceIds (use only these): ${input.allowedSourceIds.join(", ")}

Sources:
${input.sourcesBlock}
${repair}
Respond with JSON:
{
  "whatHappened": string,
  "whyItMatters": string,
  "facts": [{ "text": string, "sourceIds": string[] }],
  "analysis": [{ "text": string, "kind": "analysis"|"speculation", "sourceIds": string[] }],
  "connections": [{ "text": string, "sourceIds": string[] }],
  "angles": [{ "title": string, "description": string }]
}`;
}
