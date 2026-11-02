export function LoadingBlock() {
  return (
    <div
      className="rounded-lg border border-border bg-surface"
      style={{ padding: "var(--space-xl)", boxShadow: "var(--shadow-sm)" }}
      role="status"
      aria-live="polite"
    >
      <p
        className="font-mono text-muted-foreground"
        style={{ margin: 0, fontSize: "0.75rem", letterSpacing: "0.04em" }}
      >
        Loading workspace…
      </p>
    </div>
  );
}
