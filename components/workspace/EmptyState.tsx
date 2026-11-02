type EmptyStateProps = {
  title: string;
  description: string;
  nextAction?: string;
};

export function EmptyState({ title, description, nextAction }: EmptyStateProps) {
  return (
    <div
      className="rounded-lg border border-border bg-surface"
      style={{ padding: "var(--space-xl)", boxShadow: "var(--shadow-sm)" }}
    >
      <h2
        className="font-display text-foreground"
        style={{ margin: 0, fontSize: "1.25rem", fontWeight: 500 }}
      >
        {title}
      </h2>
      <p
        className="text-ink-secondary"
        style={{ margin: "var(--space-sm) 0 0", fontSize: "0.9375rem", lineHeight: 1.6 }}
      >
        {description}
      </p>
      {nextAction ? (
        <p
          className="font-mono text-muted-foreground"
          style={{ margin: "var(--space-md) 0 0", fontSize: "0.6875rem", letterSpacing: "0.04em" }}
        >
          {nextAction}
        </p>
      ) : null}
    </div>
  );
}
