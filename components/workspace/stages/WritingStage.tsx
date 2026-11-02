"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { DraftDto } from "@/lib/types/draft";
import type {
  SuggestionDto,
  WritingMetrics,
} from "@/lib/types/writing";
import {
  CATEGORY_HIGHLIGHT_BG,
  CATEGORY_HIGHLIGHT_FG,
} from "@/lib/types/writing";
import { EmptyState } from "../EmptyState";

type WritingStageProps = {
  draft: DraftDto | null;
  suggestions: SuggestionDto[];
  metrics: WritingMetrics | null;
  busy: boolean;
  onAnalyze: () => Promise<void>;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
};

function HighlightedDraft({
  text,
  pending,
}: {
  text: string;
  pending: SuggestionDto[];
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
        <mark
          key={s.id || `m-${i}`}
          style={{
            backgroundColor: CATEGORY_HIGHLIGHT_BG[s.category],
            color: "inherit",
            boxShadow: `inset 0 -2px 0 ${CATEGORY_HIGHLIGHT_FG[s.category]}`,
            padding: "0 1px",
          }}
        >
          {text.slice(s.startOffset, s.endOffset)}
        </mark>,
      );
      cursor = s.endOffset;
    });
    if (cursor < text.length) {
      nodes.push(<span key={`t-end`}>{text.slice(cursor)}</span>);
    }
    return nodes;
  }, [text, pending]);

  return (
    <pre
      className="whitespace-pre-wrap break-words font-sans text-secondary"
      style={{ margin: 0, fontSize: "0.9375rem", lineHeight: 1.65 }}
    >
      {parts}
    </pre>
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
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const pending = useMemo(
    () => suggestions.filter((s) => s.status === "pending"),
    [suggestions],
  );

  const visiblePending = pending.slice(0, 6);
  const extraCount = Math.max(0, pending.length - visiblePending.length);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
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

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {error ? (
          <p className="text-destructive" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(onAnalyze)}
            className="cursor-pointer bg-accent text-on-primary disabled:opacity-60"
            style={{ minHeight: 44, padding: "0 var(--space-lg)" }}
          >
            {busy ? "Analyzing…" : "Re-analyze"}
          </button>
          <button
            type="button"
            disabled={busy || !draft.originalSnapshot}
            onClick={() => setCompare((v) => !v)}
            className="cursor-pointer border border-border bg-surface text-secondary disabled:opacity-60"
            style={{ minHeight: 44, padding: "0 var(--space-lg)" }}
            aria-pressed={compare}
          >
            {compare ? "Hide compare" : "Compare original vs revised"}
          </button>
        </div>

        {compare && draft.originalSnapshot ? (
          <div className="grid gap-4 md:grid-cols-2">
            <section
              className="border border-border bg-surface"
              style={{ padding: "var(--space-lg)", boxShadow: "var(--shadow-sm)" }}
            >
              <h3
                className="text-foreground"
                style={{ margin: "0 0 var(--space-sm)", fontSize: "0.875rem", fontWeight: 600 }}
              >
                Original
              </h3>
              <pre
                className="whitespace-pre-wrap break-words font-sans text-secondary"
                style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.65 }}
              >
                {draft.originalSnapshot}
              </pre>
            </section>
            <section
              className="border border-border bg-surface"
              style={{ padding: "var(--space-lg)", boxShadow: "var(--shadow-sm)" }}
            >
              <h3
                className="text-foreground"
                style={{ margin: "0 0 var(--space-sm)", fontSize: "0.875rem", fontWeight: 600 }}
              >
                Revised
              </h3>
              <pre
                className="whitespace-pre-wrap break-words font-sans text-secondary"
                style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.65 }}
              >
                {draft.workingPlain}
              </pre>
            </section>
          </div>
        ) : (
          <section
            className="border border-border bg-surface"
            style={{ padding: "var(--space-lg)", boxShadow: "var(--shadow-sm)" }}
            aria-label="Draft with highlights"
          >
            <HighlightedDraft text={draft.workingPlain} pending={pending} />
          </section>
        )}

        <section
          className="border border-border bg-surface"
          style={{ padding: "var(--space-md)", boxShadow: "var(--shadow-sm)" }}
          aria-label="Suggestions"
        >
          <h3
            className="text-foreground"
            style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600 }}
          >
            Suggestions
          </h3>
          {pending.length === 0 ? (
            <p
              className="text-muted-foreground"
              style={{ margin: "var(--space-sm) 0 0", fontSize: "0.875rem" }}
            >
              No pending suggestions. Re-analyze after edits, or you&apos;re done.
            </p>
          ) : (
            <ul
              className="mt-3 flex flex-col gap-3"
              style={{ margin: 0, padding: 0, listStyle: "none" }}
            >
              {visiblePending.map((s, index) => (
                <li
                  key={s.id}
                  className="border border-border bg-muted"
                  style={{
                    padding: "var(--space-md)",
                    animationDelay: `${Math.min(index, 5) * 40}ms`,
                  }}
                >
                  <p
                    className="text-muted-foreground"
                    style={{ margin: 0, fontSize: "0.75rem", textTransform: "uppercase" }}
                  >
                    {s.category}
                  </p>
                  <p className="text-secondary" style={{ margin: "6px 0 0", fontSize: "0.875rem" }}>
                    <span style={{ fontWeight: 600 }}>Passage: </span>
                    {s.passage}
                  </p>
                  <p className="text-secondary" style={{ margin: "6px 0 0", fontSize: "0.875rem" }}>
                    {s.explanation}
                  </p>
                  {s.rewrite && s.rewrite !== s.passage ? (
                    <p className="text-foreground" style={{ margin: "6px 0 0", fontSize: "0.875rem" }}>
                      <span style={{ fontWeight: 600 }}>Rewrite: </span>
                      {s.rewrite}
                    </p>
                  ) : null}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={busy || actingId !== null}
                      onClick={() => {
                        setActingId(s.id);
                        void run(async () => {
                          await onAccept(s.id);
                        }).finally(() => setActingId(null));
                      }}
                      className="cursor-pointer bg-primary text-on-primary disabled:opacity-60"
                      style={{ minHeight: 44, padding: "0 var(--space-md)" }}
                    >
                      {actingId === s.id ? "Working…" : "Accept suggestion"}
                    </button>
                    <button
                      type="button"
                      disabled={busy || actingId !== null}
                      onClick={() => {
                        setActingId(s.id);
                        void run(async () => {
                          await onReject(s.id);
                        }).finally(() => setActingId(null));
                      }}
                      className="cursor-pointer border border-border bg-surface text-secondary disabled:opacity-60"
                      style={{ minHeight: 44, padding: "0 var(--space-md)" }}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {extraCount > 0 ? (
            <p
              className="text-muted-foreground"
              style={{ margin: "var(--space-sm) 0 0", fontSize: "0.8125rem" }}
            >
              +{extraCount} more pending — scroll the list after resolving these.
            </p>
          ) : null}
          {pending.length > 6 ? (
            <ul
              className="mt-3 flex flex-col gap-3"
              style={{ margin: 0, padding: 0, listStyle: "none", maxHeight: 320, overflow: "auto" }}
            >
              {pending.slice(6).map((s) => (
                <li
                  key={s.id}
                  className="border border-border bg-muted"
                  style={{ padding: "var(--space-md)" }}
                >
                  <p className="text-muted-foreground" style={{ margin: 0, fontSize: "0.75rem" }}>
                    {s.category}
                  </p>
                  <p className="text-secondary" style={{ margin: "6px 0 0", fontSize: "0.875rem" }}>
                    {s.passage}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={busy || actingId !== null}
                      onClick={() => {
                        setActingId(s.id);
                        void run(async () => {
                          await onAccept(s.id);
                        }).finally(() => setActingId(null));
                      }}
                      className="cursor-pointer bg-primary text-on-primary disabled:opacity-60"
                      style={{ minHeight: 44, padding: "0 var(--space-md)" }}
                    >
                      Accept suggestion
                    </button>
                    <button
                      type="button"
                      disabled={busy || actingId !== null}
                      onClick={() => {
                        setActingId(s.id);
                        void run(async () => {
                          await onReject(s.id);
                        }).finally(() => setActingId(null));
                      }}
                      className="cursor-pointer border border-border bg-surface text-secondary disabled:opacity-60"
                      style={{ minHeight: 44, padding: "0 var(--space-md)" }}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <aside
        className="w-full shrink-0 border border-border bg-surface lg:w-64"
        style={{ padding: "var(--space-md)", boxShadow: "var(--shadow-sm)" }}
        aria-label="Writing metrics"
      >
        <h3
          className="text-foreground"
          style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600 }}
        >
          Metrics
        </h3>
        {metrics ? (
          <ul
            style={{
              margin: "var(--space-sm) 0 0",
              padding: 0,
              listStyle: "none",
              fontSize: "0.8125rem",
              lineHeight: 1.55,
            }}
          >
            <li className="text-secondary" style={{ marginBottom: 10 }}>
              <strong className="text-foreground">Word count:</strong>{" "}
              {metrics.wordCount}
              <span className="block text-muted-foreground">
                {metrics.explanations.wordCount}
              </span>
            </li>
            <li className="text-secondary" style={{ marginBottom: 10 }}>
              <strong className="text-foreground">Avg. sentence:</strong>{" "}
              {metrics.averageSentenceLength}
              <span className="block text-muted-foreground">
                {metrics.explanations.averageSentenceLength}
              </span>
            </li>
            <li className="text-secondary" style={{ marginBottom: 10 }}>
              <strong className="text-foreground">Reading time:</strong>{" "}
              {metrics.readingTimeMinutes} min
              <span className="block text-muted-foreground">
                {metrics.explanations.readingTime}
              </span>
            </li>
            <li className="text-secondary">
              <strong className="text-foreground">Readability:</strong>{" "}
              {metrics.readabilityScore}
              <span className="block text-muted-foreground">
                {metrics.explanations.readability}
              </span>
            </li>
          </ul>
        ) : (
          <p
            className="text-muted-foreground"
            style={{ margin: "var(--space-sm) 0 0", fontSize: "0.8125rem" }}
          >
            Run analyze to compute metrics.
          </p>
        )}
        <p
          className="text-muted-foreground"
          style={{ margin: "var(--space-md) 0 0", fontSize: "0.75rem" }}
        >
          Informational — not an optimization target.
        </p>
      </aside>
    </div>
  );
}
