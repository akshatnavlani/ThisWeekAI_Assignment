export const PROJECT_STAGES = [
  "sources",
  "research",
  "draft",
  "writing",
] as const;

export type ProjectStage = (typeof PROJECT_STAGES)[number];

export type StageMeta = {
  id: ProjectStage;
  label: string;
  shortLabel: string;
};

export const STAGE_META: StageMeta[] = [
  { id: "sources", label: "Sources", shortLabel: "Sources" },
  { id: "research", label: "Research", shortLabel: "Research" },
  { id: "draft", label: "Draft", shortLabel: "Draft" },
  { id: "writing", label: "Writing", shortLabel: "Writing" },
];

export function isProjectStage(value: string): value is ProjectStage {
  return (PROJECT_STAGES as readonly string[]).includes(value);
}
