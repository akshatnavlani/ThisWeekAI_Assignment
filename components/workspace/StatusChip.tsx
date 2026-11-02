export type SourceStatusVisual = "ready" | "needs_content" | "failed";

const STYLES: Record<
  SourceStatusVisual,
  { label: string; className: string }
> = {
  ready: {
    label: "ready",
    className: "bg-sage-tint text-accent border-accent/30",
  },
  needs_content: {
    label: "needs_content",
    className: "bg-surface-subtle text-ink-secondary border-border",
  },
  failed: {
    label: "failed",
    className: "bg-terracotta-tint text-secondary border-secondary/40",
  },
};

type StatusChipProps = {
  status: SourceStatusVisual;
};

export function StatusChip({ status }: StatusChipProps) {
  const style = STYLES[status];
  return (
    <span
      className={`inline-flex items-center border font-mono text-[10px] tracking-wider uppercase ${style.className}`}
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
