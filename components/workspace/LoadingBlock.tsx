type LoadingBlockProps = {
  label?: string;
};

export function LoadingBlock({
  label = "Loading workspace…",
}: LoadingBlockProps) {
  return (
    <div
      className="flex flex-col gap-3"
      style={{ padding: "var(--space-xl)" }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-muted-foreground" style={{ margin: 0, fontSize: "0.875rem" }}>
        {label}
      </p>
      <div
        className="h-3 w-40 animate-pulse rounded bg-muted"
        aria-hidden="true"
      />
      <div
        className="h-24 w-full animate-pulse rounded bg-muted"
        aria-hidden="true"
      />
      <div
        className="h-24 w-full max-w-xl animate-pulse rounded bg-muted"
        aria-hidden="true"
      />
    </div>
  );
}
