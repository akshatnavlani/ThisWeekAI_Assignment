export const PROJECT_STAGES = ["sources", "research", "compose"] as const;

export type ProjectStage = (typeof PROJECT_STAGES)[number];

export type StageMeta = {
  id: ProjectStage;
  label: string;
  shortLabel: string;
};

export const STAGE_META: StageMeta[] = [
  { id: "sources", label: "Sources", shortLabel: "Sources" },
  { id: "research", label: "Research", shortLabel: "Research" },
  { id: "compose", label: "Compose", shortLabel: "Compose" },
];

/** Map legacy draft/writing stages onto compose. */
export function coerceProjectStage(value: string): ProjectStage {
  if (value === "draft" || value === "writing" || value === "compose") {
    return "compose";
  }
  if (value === "research") return "research";
  return "sources";
}

export function isProjectStage(value: string): value is ProjectStage {
  return (PROJECT_STAGES as readonly string[]).includes(value);
}
