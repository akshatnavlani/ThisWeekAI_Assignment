"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { DraftDto } from "@/lib/types/draft";
import type {
  SuggestionCategory,
  SuggestionDto,
  WritingMetrics,
} from "@/lib/types/writing";
import { SUGGESTION_CATEGORIES } from "@/lib/types/writing";
import { MarkdownBody } from "@/components/ui/MarkdownBody";
import { EmptyState } from "../EmptyState";
import { SuggestionMark } from "../SuggestionMark";

type WritingStageProps = {
  draft: DraftDto | null;
  suggestions: SuggestionDto[];
  metrics: WritingMetrics | null;
  busy: boolean;
  onAnalyze: () => Promise<void>;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
};

type CategoryFilter = "all" | SuggestionCategory;

function HighlightedDraft({
  text,
  pending,
  busy,
  actingId,
  onAccept,
  onReject,
}: {
  text: string;
  pending: SuggestionDto[];
  busy: boolean;
  actingId: string | null;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}) {
  const parts = useMemo(() => {
    const sorted = [...pending]
      .filter((s) => s.startOffset >= 0 && s.endOffset > s.startOffset)
      .sort((a, b) => a.startOffset - b.startOffset);

    const nodes: ReactNode[] = [];
    let cursor = 0;
    sorted.forEach((s, i) => {
      if (s.startOffset < cursor) return;
      if (s.startOffset > cursor) {
        nodes.push(
          <span key={`t-${cursor}`}>{text.slice(cursor, s.startOffset)}</span>,
        );
      }
      nodes.push(
        <SuggestionMark
          key={s.id || `m-${i}`}
          suggestion={s}
          text={text.slice(s.startOffset, s.endOffset)}
          busy={busy}
          actingId={actingId}
          onAccept={onAccept}
          onReject={onReject}
        />,
      );
      cursor = s.endOffset;
    });
    if (cursor < text.length) {
      nodes.push(<span key={`t-end`}>{text.slice(cursor)}</span>);
    }
    return nodes;
  }, [text, pending, busy, actingId, onAccept, onReject]);

  return (
    <div
      className="whitespace-pre-wrap break-words font-sans text-[1.0625rem] leading-[1.65] text-ink-secondary"
      style={{ margin: 0 }}
    >
      {parts}
    </div>
  );
}

export function WritingStage({
  draft,
  suggestions,
  metrics,
  busy,
  onAnalyze,
  onAccept,
  onReject,
}: WritingStageProps) {
  const [compare, setCompare] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [renderedPreview, setRenderedPreview] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const pending = useMemo(
    () => suggestions.filter((s) => s.status === "pending"),
    [suggestions],
  );

  const filteredPending = useMemo(() => {
    if (categoryFilter === "all") return pending;
    return pending.filter((s) => s.category === categoryFilter);
  }, [pending, categoryFilter]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: pending.length };
    for (const cat of SUGGESTION_CATEGORIES) {
      map[cat] = pending.filter((s) => s.category === cat).length;
    }
    return map;
  }, [pending]);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  };

  const accept = async (id: string) => {
    setActingId(id);
    try {
      await run(async () => {
        await onAccept(id);
      });
    } finally {
      setActingId(null);
    }
  };

  const reject = async (id: string) => {
    setActingId(id);
    try {
      await run(async () => {
        await onReject(id);
      });
    } finally {
      setActingId(null);
    }
  };

  if (!draft || !draft.workingPlain.trim()) {
    return (
      <EmptyState
        title="No working draft to analyze"
        description="Generate or write a draft first, then run Analyze writing."
        nextAction="Return to Draft stage"
      />
    );
  }

  const filterChips: { id: CategoryFilter; label: string }[] = [
    { id: "all", label: `All (${counts.all ?? 0})` },
    { id: "complex", label: `Complex (${counts.complex ?? 0})` },
    { id: "passive", label: `Passive (${counts.passive ?? 0})` },
    { id: "filler", label: `Filler (${counts.filler ?? 0})` },
  ];

  return (
    <div className="flex flex-col gap-4">
      {!focusMode ? (
        <section className="sticky top-[4.5rem] z-20 rounded-lg border border-border bg-surface-container-low/95 p-3 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-ink-secondary">
              {metrics ? (
                <>
                  <span className="rounded bg-surface-container px-2 py-1">
                    <strong className="text-foreground">{metrics.wordCount}</strong> words
                  </span>
                  <span className="rounded bg-surface-container px-2 py-1">
                    ~{metrics.readingTimeMinutes} min
                  </span>
                  <span className="rounded bg-surface-container px-2 py-1">
                    avg {metrics.averageSentenceLength}
                  </span>
                  <span className="rounded bg-sage-tint px-2 py-1 text-accent">
                    read {metrics.readabilityScore}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Run analyze for metrics</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
              {filterChips.map((chip) => {
                const active = categoryFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setCategoryFilter(chip.id)}
                    className={`shrink-0 cursor-pointer rounded px-2.5 py-1 font-mono text-[11px] tracking-wide ${
                      active
                        ? "bg-primary text-on-primary shadow-sm"
                        : "bg-surface-container text-ink-secondary hover:bg-surface-container-high"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg bg-surface-container p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setCompare(false);
                    setRenderedPreview(false);
                  }}
                  className={`rounded px-2.5 py-1 font-mono text-[11px] ${
                    !compare && !renderedPreview
                      ? "bg-surface text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Edit canvas
                </button>
                <button
                  type="button"
                  disabled={!draft.originalSnapshot}
                  onClick={() => {
                    setCompare(true);
                    setRenderedPreview(false);
                  }}
                  className={`rounded px-2.5 py-1 font-mono text-[11px] disabled:opacity-40 ${
                    compare
                      ? "bg-surface text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Compare
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRenderedPreview(true);
                    setCompare(false);
                  }}
                  className={`rounded px-2.5 py-1 font-mono text-[11px] ${
                    renderedPreview
                      ? "bg-surface text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  MD preview
                </button>
              </div>
              <button
                type="button"
                onClick={() => setFocusMode(true)}
                className="cursor-pointer rounded border border-border px-3 py-1.5 font-mono text-[11px] text-ink-secondary"
              >
                Focus
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(onAnalyze)}
                className="cursor-pointer rounded border border-secondary bg-terracotta-tint px-3 py-1.5 font-mono text-[11px] text-secondary disabled:opacity-60"
              >
                {busy ? "Analyzing…" : "Re-analyze"}
              </button>
            </div>
          </div>
          {pending.length > 0 ? (
            <p className="mt-2 font-mono text-[10px] text-muted-foreground" style={{ margin: "8px 0 0" }}>
              Hover or tap a highlighted passage for explanation, rewrite, Accept / Reject.
            </p>
          ) : null}
        </section>
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setFocusMode(false)}
            className="cursor-pointer rounded border border-border bg-surface px-3 py-1.5 font-mono text-[11px] text-ink-secondary"
          >
            Exit focus
          </button>
        </div>
      )}

      {error ? (
        <p className="font-mono text-sm text-destructive" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      ) : null}

      <div
        className={`flex flex-col gap-6 ${focusMode ? "" : "lg:flex-row lg:items-start"}`}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {compare && draft.originalSnapshot ? (
            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
                <h3 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground" style={{ margin: 0 }}>
                  Original
                </h3>
                <div className="mt-3">
                  <MarkdownBody content={draft.originalSnapshot} />
                </div>
              </section>
              <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
                <h3 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground" style={{ margin: 0 }}>
                  Revised
                </h3>
                <div className="mt-3">
                  <MarkdownBody content={draft.workingPlain} />
                </div>
              </section>
            </div>
          ) : renderedPreview ? (
            <section
              className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-8"
              aria-label="Markdown preview"
            >
              <MarkdownBody content={draft.workingPlain} />
            </section>
          ) : (
            <section
              className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-8"
              aria-label="Draft with highlights"
            >
              <HighlightedDraft
                text={draft.workingPlain}
                pending={filteredPending}
                busy={busy}
                actingId={actingId}
                onAccept={accept}
                onReject={reject}
              />
              {pending.length === 0 ? (
                <p className="mt-4 font-mono text-[11px] text-muted-foreground" style={{ margin: "16px 0 0" }}>
                  No pending suggestions. Re-analyze after edits, or you&apos;re done.
                </p>
              ) : null}
            </section>
          )}
        </div>

        {!focusMode ? (
          <aside
            className="w-full shrink-0 rounded-lg border border-border bg-surface-subtle lg:w-72"
            style={{ padding: "var(--space-md)", boxShadow: "var(--shadow-sm)" }}
            aria-label="Writing metrics"
          >
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground" style={{ margin: 0 }}>
              Metrics
            </h3>
            {metrics ? (
              <ul
                style={{
                  margin: "12px 0 0",
                  padding: 0,
                  listStyle: "none",
                  fontSize: "0.8125rem",
                  lineHeight: 1.55,
                }}
              >
                <li className="mb-3 rounded border border-border bg-surface p-2">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">
                    Word count
                  </span>
                  <p className="font-display text-2xl text-foreground" style={{ margin: "4px 0 0" }}>
                    {metrics.wordCount}
                  </p>
                  <span className="block text-muted-foreground">
                    {metrics.explanations.wordCount}
                  </span>
                </li>
                <li className="mb-3 rounded border border-border bg-surface p-2">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">
                    Avg. sentence
                  </span>
                  <p className="font-display text-xl text-foreground" style={{ margin: "4px 0 0" }}>
                    {metrics.averageSentenceLength}
                  </p>
                  <span className="block text-muted-foreground">
                    {metrics.explanations.averageSentenceLength}
                  </span>
                </li>
                <li className="mb-3 rounded border border-border bg-surface p-2">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">
                    Reading time
                  </span>
                  <p className="font-display text-xl text-foreground" style={{ margin: "4px 0 0" }}>
                    {metrics.readingTimeMinutes} min
                  </p>
                  <span className="block text-muted-foreground">
                    {metrics.explanations.readingTime}
                  </span>
                </li>
                <li className="rounded border border-border bg-surface p-2">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">
                    Readability
                  </span>
                  <p className="font-display text-xl text-foreground" style={{ margin: "4px 0 0" }}>
                    {metrics.readabilityScore}
                  </p>
                  <span className="block text-muted-foreground">
                    {metrics.explanations.readability}
                  </span>
                </li>
              </ul>
            ) : (
              <p className="font-mono text-[11px] text-muted-foreground" style={{ margin: "12px 0 0" }}>
                Run analyze to compute metrics.
              </p>
            )}
            <p className="font-mono text-[10px] text-muted-foreground" style={{ margin: "16px 0 0" }}>
              Informational — not an optimization target.
            </p>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
