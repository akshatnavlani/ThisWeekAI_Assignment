"use client";

import { useEffect, useMemo, useState } from "react";
import type { BriefDto } from "@/lib/types/brief";
import type { SourceDto } from "@/lib/types/source";
import { MarkdownBody } from "@/components/ui/MarkdownBody";
import { EmptyState } from "../EmptyState";
import { StatusChip, type SourceStatusVisual } from "../StatusChip";

type ResearchStageProps = {
  brief: BriefDto | null;
  sources: SourceDto[];
  selectedAngleId: string | null;
  onSelectedAngleIdChange: (angleId: string) => void;
  onChanged: () => Promise<void> | void;
  onContinueToDraft: () => void;
};

function isStatusChip(status: string): status is SourceStatusVisual {
  return (
    status === "ready" ||
    status === "needs_content" ||
    status === "failed"
  );
}

function SourceChips({
  sourceIds,
  sourcesById,
}: {
  sourceIds: string[];
  sourcesById: Map<string, SourceDto>;
}) {
  const chips = sourceIds.flatMap((id) => {
    const source = sourcesById.get(id);
    const label = source?.title?.trim() || source?.url || "";
    if (!label) return [];
    if (source?.url) {
      return [
        <a
          key={id}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-border bg-surface-subtle font-mono text-[11px] text-ink-secondary underline-offset-2 hover:underline"
          style={{ padding: "2px 8px" }}
        >
          {label}
        </a>,
      ];
    }
    return [
      <span
        key={id}
        className="rounded border border-border bg-surface-subtle font-mono text-[10px] tracking-wide text-ink-secondary"
        style={{ padding: "2px 8px" }}
      >
        {label}
      </span>,
    ];
  });
  if (chips.length === 0) return null;
  return <div className="mt-2 flex flex-wrap gap-2">{chips}</div>;
}

export function ResearchStage({
  brief,
  sources,
  selectedAngleId,
  onSelectedAngleIdChange,
  onChanged,
  onContinueToDraft,
}: ResearchStageProps) {
  const [whatHappened, setWhatHappened] = useState("");
  const [whyItMatters, setWhyItMatters] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWhatHappened(brief?.whatHappened ?? "");
    setWhyItMatters(brief?.whyItMatters ?? "");
  }, [brief]);

  useEffect(() => {
    if (!brief?.angles.length) return;
    if (
      !selectedAngleId ||
      !brief.angles.some((a) => a.id === selectedAngleId)
    ) {
      onSelectedAngleIdChange(brief.angles[0]!.id);
    }
  }, [brief, selectedAngleId, onSelectedAngleIdChange]);

  const sourcesById = useMemo(
    () => new Map(sources.map((s) => [s.id, s])),
    [sources],
  );

  const regenerate = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/research/generate", { method: "POST" });
      const data = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setError(data.error?.message ?? `Generate failed (${res.status})`);
        return;
      }
      await onChanged();
      setEditing(false);
    } catch {
      setError("Network error while generating brief");
    } finally {
      setBusy(false);
    }
  };

  const saveEdits = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/research/brief", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatHappened, whyItMatters }),
      });
      const data = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setError(data.error?.message ?? `Save failed (${res.status})`);
        return;
      }
      await onChanged();
      setEditing(false);
    } catch {
      setError("Network error while saving brief");
    } finally {
      setBusy(false);
    }
  };

  if (!brief) {
    return (
      <div className="flex flex-col gap-6">
        <EmptyState
          title="No brief yet"
          description="Generate a structured research brief from ≥3 ready sources (Sources stage)."
          nextAction="Add usable sources, then Generate research brief"
        />
        {error ? (
          <p className="font-mono text-sm text-destructive" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void regenerate()}
          className="cursor-pointer self-start rounded bg-primary px-5 font-mono text-[11px] tracking-wide text-on-primary disabled:opacity-60"
          style={{ minHeight: 44 }}
        >
          {busy ? "Generating…" : "Generate research brief"}
        </button>
      </div>
    );
  }

  const canContinue = brief.angles.length >= 1;

  const dossier = (
    <div className="flex flex-col gap-5">
      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-display text-xl text-foreground" style={{ margin: 0 }}>
            What happened
          </h3>
          <button
            type="button"
            disabled={busy}
            onClick={() => setEditing((v) => !v)}
            className="cursor-pointer font-mono text-[11px] text-muted-foreground hover:text-foreground"
          >
            {editing ? "Preview" : "Edit"}
          </button>
        </div>
        {editing ? (
          <textarea
            value={whatHappened}
            onChange={(e) => setWhatHappened(e.target.value)}
            rows={4}
            disabled={busy}
            className="mt-2 w-full rounded border border-border bg-surface text-foreground focus:border-foreground focus:outline-none"
            style={{ padding: "var(--space-md)" }}
          />
        ) : (
          <MarkdownBody content={whatHappened} />
        )}
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h3 className="font-display text-xl text-foreground" style={{ margin: 0 }}>
          Why it matters
        </h3>
        {editing ? (
          <textarea
            value={whyItMatters}
            onChange={(e) => setWhyItMatters(e.target.value)}
            rows={4}
            disabled={busy}
            className="mt-2 w-full rounded border border-border bg-surface text-foreground focus:border-foreground focus:outline-none"
            style={{ padding: "var(--space-md)" }}
          />
        ) : (
          <div className="mt-2">
            <MarkdownBody content={whyItMatters} />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h3 className="font-display text-xl text-foreground" style={{ margin: 0 }}>
          Facts
        </h3>
        <ul className="mt-3 flex flex-col gap-3" style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {brief.facts.map((fact, index) => (
            <li key={`fact-${index}`} className="border-l-2 border-accent pl-3">
              <MarkdownBody content={fact.text} />
              <SourceChips sourceIds={fact.sourceIds} sourcesById={sourcesById} />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h3 className="font-display text-xl text-foreground" style={{ margin: 0 }}>
          Analysis
        </h3>
        <ul className="mt-3 flex flex-col gap-3" style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {brief.analysis.map((item, index) => (
            <li key={`analysis-${index}`}>
              <p className="font-mono text-[11px] text-muted-foreground" style={{ margin: 0 }}>
                {item.kind}
              </p>
              <div className="mt-1">
                <MarkdownBody content={item.text} />
              </div>
              <SourceChips sourceIds={item.sourceIds} sourcesById={sourcesById} />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h3 className="font-display text-xl text-foreground" style={{ margin: 0 }}>
          Connections
        </h3>
        <ul className="mt-3 flex flex-col gap-3" style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {brief.connections.map((item, index) => (
            <li key={`conn-${index}`}>
              <MarkdownBody content={item.text} />
              <SourceChips sourceIds={item.sourceIds} sourcesById={sourcesById} />
            </li>
          ))}
        </ul>
      </section>

    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <p className="font-mono text-sm text-destructive" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <aside className="flex flex-col gap-3 lg:col-span-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl text-foreground" style={{ margin: 0 }}>
              Corpus
            </h2>
            <span className="font-mono text-[10px] text-muted-foreground">
              {sources.length} sources
            </span>
          </div>
          <ul className="flex flex-col gap-2" style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {sources.map((source) => (
              <li
                key={source.id}
                className="rounded border border-border bg-surface-subtle p-3"
              >
                <p className="font-display text-base text-foreground" style={{ margin: 0 }}>
                  {source.title?.trim() || source.url || "Untitled"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {isStatusChip(source.status) ? (
                    <StatusChip status={source.status} />
                  ) : null}
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {source.kind}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <div className="lg:col-span-8">{dossier}</div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        {editing ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveEdits()}
            className="cursor-pointer rounded bg-primary px-4 font-mono text-[11px] tracking-wide text-on-primary disabled:opacity-60"
            style={{ minHeight: 44 }}
          >
            Save edits
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void regenerate()}
          className="cursor-pointer rounded border border-border bg-surface px-4 font-mono text-[11px] tracking-wide text-ink-secondary disabled:opacity-60"
          style={{ minHeight: 44 }}
        >
          {busy ? "Working…" : "Full regenerate"}
        </button>
        <button
          type="button"
          disabled={!canContinue || busy}
          onClick={onContinueToDraft}
          className="cursor-pointer rounded bg-primary px-5 font-mono text-[11px] tracking-wide text-on-primary disabled:cursor-not-allowed disabled:opacity-40"
          style={{ minHeight: 44 }}
        >
          Continue to Compose
        </button>
      </div>
    </div>
  );
}
