import { EmptyState } from "../EmptyState";

export function WritingStage() {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <EmptyState
          title="Writing assist not active yet"
          description="Run Analyze from Draft when available. Highlights, accept/reject, and compare land in M6."
          nextAction="Analyze a working draft"
        />

        <section
          className="min-h-48 border border-border bg-surface"
          style={{ padding: "var(--space-lg)", boxShadow: "var(--shadow-sm)" }}
          aria-label="Draft surface placeholder"
        >
          <p className="text-muted-foreground" style={{ margin: 0 }}>
            Draft text with inline highlights will appear here.
          </p>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled
            className="border border-border bg-surface text-muted-foreground"
            style={{ minHeight: 44, padding: "0 var(--space-lg)" }}
          >
            Compare original vs revised
          </button>
        </div>

        <section
          className="border border-border bg-surface"
          style={{ padding: "var(--space-md)", boxShadow: "var(--shadow-sm)" }}
          aria-label="Suggestions placeholder"
        >
          <h3
            className="text-foreground"
            style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600 }}
          >
            Suggestions
          </h3>
          <p
            className="text-muted-foreground"
            style={{ margin: "var(--space-sm) 0 var(--space-md)", fontSize: "0.875rem" }}
          >
            No suggestions yet.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled
              className="border border-border bg-muted text-muted-foreground"
              style={{ minHeight: 44, padding: "0 var(--space-md)" }}
            >
              Accept
            </button>
            <button
              type="button"
              disabled
              className="border border-border bg-muted text-muted-foreground"
              style={{ minHeight: 44, padding: "0 var(--space-md)" }}
            >
              Reject
            </button>
          </div>
        </section>
      </div>

      <aside
        className="w-full shrink-0 border border-border bg-surface lg:w-64"
        style={{ padding: "var(--space-md)", boxShadow: "var(--shadow-sm)" }}
        aria-label="Writing metrics placeholder"
      >
        <h3
          className="text-foreground"
          style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600 }}
        >
          Metrics
        </h3>
        <ul
          className="text-muted-foreground"
          style={{
            margin: "var(--space-sm) 0 0",
            paddingLeft: "1.1rem",
            fontSize: "0.8125rem",
            lineHeight: 1.7,
          }}
        >
          <li>Word count — explanation in M6</li>
          <li>Avg. sentence length — explanation in M6</li>
          <li>Reading time — explanation in M6</li>
          <li>Readability — informational only</li>
        </ul>
      </aside>
    </div>
  );
}
