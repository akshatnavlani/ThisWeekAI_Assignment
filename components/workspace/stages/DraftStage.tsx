import { RefreshCw } from "lucide-react";
import { EmptyState } from "../EmptyState";

const DRAFT_SECTIONS = [
  "Headline",
  "What happened",
  "Context",
  "Analysis",
  "Implication",
  "Sources",
] as const;

export function DraftStage() {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <EmptyState
          title="No draft yet"
          description="Starter draft or outline-only generation arrives in M5. Section regenerate stays distinct from writing suggestions."
          nextAction="Pick an angle and generate a draft"
        />

        <div
          className="inline-flex border border-border bg-surface"
          role="group"
          aria-label="Draft mode"
        >
          <button
            type="button"
            disabled
            className="border-r border-border bg-muted text-muted-foreground"
            style={{ minHeight: 44, padding: "0 var(--space-md)" }}
            aria-pressed="true"
          >
            Starter draft
          </button>
          <button
            type="button"
            disabled
            className="bg-surface text-muted-foreground"
            style={{ minHeight: 44, padding: "0 var(--space-md)" }}
            aria-pressed="false"
          >
            Outline only
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {DRAFT_SECTIONS.map((label) => (
            <section
              key={label}
              className="border border-border bg-surface"
              style={{
                padding: "var(--space-md)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <h3
                  className="text-foreground"
                  style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600 }}
                >
                  {label}
                </h3>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1 border border-border bg-surface text-muted-foreground"
                  style={{
                    minHeight: 44,
                    padding: "0 var(--space-md)",
                  }}
                >
                  <RefreshCw className="size-3.5" aria-hidden="true" />
                  Regenerate
                </button>
              </div>
              <p
                className="text-muted-foreground"
                style={{
                  margin: "var(--space-sm) 0 0",
                  fontSize: "0.875rem",
                  minHeight: "2.5rem",
                }}
              >
                Section body placeholder.
              </p>
            </section>
          ))}
        </div>

        <div>
          <button
            type="button"
            disabled
            className="bg-accent/40 text-on-primary"
            style={{ minHeight: 44, padding: "0 var(--space-lg)" }}
          >
            Analyze writing
          </button>
          <p
            className="text-muted-foreground"
            style={{ margin: "var(--space-sm) 0 0", fontSize: "0.8125rem" }}
          >
            Writing assist unlocks in M6.
          </p>
        </div>
      </div>

      <aside
        className="w-full shrink-0 border border-border bg-surface lg:w-64"
        style={{ padding: "var(--space-md)", boxShadow: "var(--shadow-sm)" }}
        aria-label="Draft metrics and suggestions placeholder"
      >
        <h3
          className="text-foreground"
          style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600 }}
        >
          Metrics & suggestions
        </h3>
        <p
          className="text-muted-foreground"
          style={{ margin: "var(--space-sm) 0 0", fontSize: "0.8125rem" }}
        >
          Metrics and suggestions appear here after analyze.
        </p>
      </aside>
    </div>
  );
}
