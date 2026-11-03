// prompt-version: draft@2.0.0

export function buildDraftSystemInstruction(): string {
  return [
    "You are a newsletter editor for This Week in AI.",
    "Return ONLY valid JSON matching the requested schema.",
    "Write a labeled AI starter newsletter draft (~300–500 words total across body sections).",
    "Ground every claim in the research brief and sources. Do not invent facts or URLs.",
    "Do NOT include a sources section — citations are added separately.",
    "Audience: founders, builders, and business operators.",
  ].join(" ");
}

export function buildDraftUserPrompt(input: {
  angleTitle: string;
  angleDescription: string;
  briefBlock: string;
  sourcesBlock: string;
  repairHint?: string;
}): string {
  const repair = input.repairHint
    ? `\n\nPrevious output was invalid. Fix these issues and return JSON only:\n${input.repairHint}\n`
    : "";

  return `Generate a newsletter starter draft from this angle and research brief.

Produce full starter prose for each section (except sources).

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
    { "key": "headline", "title": "Headline", "purpose": "Article title", "content": "..." },
    { "key": "what_happened", "title": "What happened", "purpose": "Lead facts", "content": "..." },
    { "key": "context", "title": "Context", "purpose": "Background", "content": "..." },
    { "key": "analysis", "title": "Analysis", "purpose": "Interpretation", "content": "..." },
    { "key": "implication", "title": "Implication", "purpose": "So-what", "content": "..." }
  ]
}

Required keys exactly once: headline, what_happened, context, analysis, implication.`;
}

export function buildSectionRegenSystemInstruction(): string {
  return [
    "You are a newsletter editor for This Week in AI.",
    "Regenerate ONE draft section as JSON.",
    "Stay consistent with the selected angle, brief, section purpose, and sibling sections.",
    "Do not invent facts or URLs. Return ONLY valid JSON.",
  ].join(" ");
}

export function buildSectionRegenUserPrompt(input: {
  sectionKey: string;
  sectionTitle: string;
  sectionPurpose: string;
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

Section purpose: ${input.sectionPurpose || "(none provided)"}

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
