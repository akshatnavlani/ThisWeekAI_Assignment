export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header
        className="border-b border-border bg-surface"
        style={{ padding: "var(--space-md) var(--space-xl)" }}
      >
        <p
          className="font-display text-primary"
          style={{ fontSize: "1.5rem", lineHeight: 1.2, margin: 0 }}
        >
          This Week in AI
        </p>
        <p
          className="text-muted-foreground"
          style={{ margin: "var(--space-xs) 0 0", fontSize: "0.875rem" }}
        >
          Editorial Workspace
        </p>
      </header>

      <main
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center"
        style={{ padding: "var(--space-2xl) var(--space-xl)" }}
      >
        <div
          className="border border-border bg-surface"
          style={{
            padding: "var(--space-xl)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <h1
            className="font-display text-foreground"
            style={{ fontSize: "1.75rem", lineHeight: 1.25, margin: 0 }}
          >
            Workspace foundation
          </h1>
          <p
            className="text-secondary"
            style={{
              margin: "var(--space-md) 0 0",
              lineHeight: 1.6,
              maxWidth: "40rem",
            }}
          >
            Empty shell for the editorial workflow. Product stages arrive in
            later milestones:
          </p>
          <p
            className="text-muted-foreground"
            style={{
              margin: "var(--space-lg) 0 0",
              fontSize: "0.9375rem",
              letterSpacing: "0.01em",
            }}
          >
            Sources → Research → Draft → Writing
          </p>
          <p
            className="text-muted-foreground"
            style={{
              margin: "var(--space-sm) 0 0",
              fontSize: "0.8125rem",
            }}
          >
            Coming later — no product features in this foundation build.
          </p>
        </div>
      </main>
    </div>
  );
}
