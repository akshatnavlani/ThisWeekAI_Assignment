export type SourceStatusVisual = "ready" | "needs_content" | "failed";

const STYLES: Record<
  SourceStatusVisual,
  { label: string; className: string }
> = {
  ready: {
    label: "Ready",
    className: "bg-surface-subtle text-ink-secondary border-border",
  },
  needs_content: {
    label: "Needs content",
    className: "bg-surface-subtle text-ink-secondary border-border",
  },
  failed: {
    label: "Failed",
    className: "bg-surface-subtle text-destructive border-border",
  },
};

type StatusChipProps = {
  status: SourceStatusVisual;
};

export function StatusChip({ status }: StatusChipProps) {
  const style = STYLES[status];
  return (
    <span
      className={`inline-flex items-center border font-mono text-[11px] ${style.className}`}
      style={{
        minHeight: 28,
        padding: "0 8px",
        borderRadius: "var(--radius-sm)",
      }}
    >
      {style.label}
    </span>
  );
}
