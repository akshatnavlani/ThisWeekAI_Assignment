type EmptyStateProps = {
  title: string;
  description: string;
  nextAction?: string;
};

export function EmptyState({
  title,
  description,
  nextAction,
}: EmptyStateProps) {
  return (
    <div
      className="border border-dashed border-border bg-muted/40"
      style={{ padding: "var(--space-xl)" }}
    >
      <h2
        className="font-display text-foreground"
        style={{ fontSize: "1.25rem", margin: 0, lineHeight: 1.3 }}
      >
        {title}
      </h2>
      <p
        className="text-secondary"
        style={{ margin: "var(--space-sm) 0 0", lineHeight: 1.6 }}
      >
        {description}
      </p>
      {nextAction ? (
        <p
          className="text-muted-foreground"
          style={{ margin: "var(--space-md) 0 0", fontSize: "0.875rem" }}
        >
          Next: {nextAction}
        </p>
      ) : null}
    </div>
  );
}
