"use client";

import { STAGE_META, type ProjectStage } from "@/lib/workspace/stages";

type StageStepperProps = {
  active: ProjectStage;
  disabled?: boolean;
  onSelect: (stage: ProjectStage) => void;
};

export function StageStepper({
  active,
  disabled = false,
  onSelect,
}: StageStepperProps) {
  return (
    <nav
      aria-label="Editorial stages"
      className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-surface-container p-1"
    >
      {STAGE_META.map((stage) => {
        const isActive = stage.id === active;
        return (
          <button
            key={stage.id}
            type="button"
            disabled={disabled}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onSelect(stage.id)}
            className={`shrink-0 cursor-pointer rounded px-3 py-2 font-mono text-[11px] tracking-wide transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 ${
              isActive
                ? "bg-primary text-on-primary shadow-sm"
                : "bg-transparent text-muted-foreground hover:bg-surface-container-high hover:text-foreground"
            }`}
            style={{ minHeight: 40 }}
          >
            {stage.label}
          </button>
        );
      })}
    </nav>
  );
}
