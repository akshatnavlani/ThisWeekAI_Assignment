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
    <nav aria-label="Editorial stages">
      <ol
        className="flex flex-wrap items-stretch gap-1"
        style={{ margin: 0, padding: 0, listStyle: "none" }}
      >
        {STAGE_META.map((stage, index) => {
          const isActive = stage.id === active;
          return (
            <li key={stage.id} className="flex items-center gap-1">
              {index > 0 ? (
                <span
                  className="text-muted-foreground hidden sm:inline"
                  aria-hidden="true"
                  style={{ padding: "0 var(--space-xs)" }}
                >
                  →
                </span>
              ) : null}
              <button
                type="button"
                disabled={disabled}
                aria-current={isActive ? "step" : undefined}
                onClick={() => onSelect(stage.id)}
                className={`cursor-pointer border-b-2 bg-transparent text-sm transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                  isActive
                    ? "border-accent text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                style={{
                  minHeight: 44,
                  minWidth: 44,
                  padding: "0 var(--space-sm)",
                }}
              >
                {stage.label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
