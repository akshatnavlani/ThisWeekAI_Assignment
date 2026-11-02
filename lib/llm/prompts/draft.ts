// prompt-version: draft@1.0.0

export function buildDraftSystemInstruction(mode: "starter_draft" | "outline_only"): string {
  const modeLine =
    mode === "starter_draft"
      ? "Write a labeled AI starter newsletter draft (~300–500 words total across body sections)."
      : "Write an outline only: bullets and key claims, not polished prose paragraphs.";

  return [
    "You are a newsletter editor for This Week in AI.",
    "Return ONLY valid JSON matching the requested schema.",
    modeLine,
    "Ground every claim in the research brief and sources. Do not invent facts or URLs.",
    "Do NOT include a sources section — citations are added separately.",
    "Audience: founders, builders, and business operators.",
  ].join(" ");
}

export function buildDraftUserPrompt(input: {
  mode: "starter_draft" | "outline_only";
  angleTitle: string;
  angleDescription: string;
  briefBlock: string;
  sourcesBlock: string;
  repairHint?: string;
}): string {
  const repair = input.repairHint
    ? `\n\nPrevious output was invalid. Fix these issues and return JSON only:\n${input.repairHint}\n`
    : "";

  const modeHint =
    input.mode === "starter_draft"
      ? "Produce full starter prose for each section (except sources)."
      : "Produce outline bullets / key points for each section (except sources).";

  return `Generate a newsletter draft from this angle and research brief.

Mode: ${input.mode}
${modeHint}

Selected angle title: ${input.angleTitle}
Selected angle description: ${input.angleDescription}

Research brief:
${input.briefBlock}

Supporting source excerpts:
${input.sourcesBlock}
${repair}
Respond with JSON:
{
  "sections": [
    { "key": "headline", "title": "Headline", "content": "..." },
    { "key": "what_happened", "title": "What happened", "content": "..." },
    { "key": "context", "title": "Context", "content": "..." },
    { "key": "analysis", "title": "Analysis", "content": "..." },
    { "key": "implication", "title": "Implication", "content": "..." }
  ]
}

Required keys exactly once: headline, what_happened, context, analysis, implication.`;
}

export function buildSectionRegenSystemInstruction(): string {
  return [
    "You are a newsletter editor for This Week in AI.",
    "Regenerate ONE draft section as JSON.",
    "Stay consistent with the selected angle, brief, and sibling sections.",
    "Do not invent facts or URLs. Return ONLY valid JSON.",
  ].join(" ");
}

export function buildSectionRegenUserPrompt(input: {
  sectionKey: string;
  sectionTitle: string;
  angleTitle: string;
  angleDescription: string;
  briefBlock: string;
  siblingsBlock: string;
  repairHint?: string;
}): string {
  const repair = input.repairHint
    ? `\n\nPrevious output was invalid. Fix these issues and return JSON only:\n${input.repairHint}\n`
    : "";

  return `Regenerate the "${input.sectionTitle}" section (${input.sectionKey}).

Selected angle title: ${input.angleTitle}
Selected angle description: ${input.angleDescription}

Research brief:
${input.briefBlock}

Sibling sections (for consistency — do not rewrite them):
${input.siblingsBlock}
${repair}
Respond with JSON:
{
  "key": "${input.sectionKey}",
  "title": "${input.sectionTitle}",
  "content": "..."
}`;
}
