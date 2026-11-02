export type SourceStatusVisual = "ready" | "needs_content" | "failed";

const STYLES: Record<
  SourceStatusVisual,
  { label: string; className: string }
> = {
  ready: {
    label: "ready",
    className: "bg-accent/10 text-accent border-accent/30",
  },
  needs_content: {
    label: "needs_content",
    className: "bg-muted text-secondary border-border",
  },
  failed: {
    label: "failed",
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
};

type StatusChipProps = {
  status: SourceStatusVisual;
};

export function StatusChip({ status }: StatusChipProps) {
  const style = STYLES[status];
  return (
    <span
      className={`inline-flex items-center border font-mono text-xs ${style.className}`}
      style={{
        minHeight: 28,
        padding: "0 var(--space-sm)",
        borderRadius: 2,
      }}
    >
      {style.label}
    </span>
  );
}
