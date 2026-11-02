"use client";

import { useEffect, useMemo, useState } from "react";
import type { BriefDto } from "@/lib/types/brief";
import type { SourceDto } from "@/lib/types/source";
import { EmptyState } from "../EmptyState";

type ResearchStageProps = {
  brief: BriefDto | null;
  sources: SourceDto[];
  selectedAngleId: string | null;
  onSelectedAngleIdChange: (angleId: string) => void;
  onChanged: () => Promise<void> | void;
  onContinueToDraft: () => void;
};

function SourceChips({
  sourceIds,
  sourcesById,
}: {
  sourceIds: string[];
  sourcesById: Map<string, SourceDto>;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {sourceIds.map((id) => {
        const source = sourcesById.get(id);
        const label = source?.title?.trim() || source?.url || id.slice(0, 8);
        if (source?.url) {
          return (
            <a
              key={id}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-border bg-muted font-mono text-xs text-secondary underline-offset-2 hover:underline"
              style={{ padding: "2px 8px" }}
            >
              {label}
            </a>
          );
        }
        return (
          <span
            key={id}
            className="border border-border bg-muted font-mono text-xs text-secondary"
            style={{ padding: "2px 8px" }}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
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
          <p className="text-destructive" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void regenerate()}
          className="cursor-pointer self-start bg-accent text-on-primary disabled:opacity-60"
          style={{ minHeight: 44, padding: "0 var(--space-lg)" }}
        >
          {busy ? "Generating…" : "Generate research brief"}
        </button>
      </div>
    );
  }

  const canContinue = brief.angles.length >= 1;

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <p className="text-destructive" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      ) : null}

      <section
        className="border border-border bg-surface"
        style={{ padding: "var(--space-md)", boxShadow: "var(--shadow-sm)" }}
      >
        <h3 className="text-foreground" style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600 }}>
          What happened
        </h3>
        <textarea
          value={whatHappened}
          onChange={(e) => setWhatHappened(e.target.value)}
          rows={4}
          disabled={busy}
          className="mt-2 w-full border border-border bg-surface text-foreground"
          style={{ padding: "var(--space-md)" }}
        />
      </section>

      <section
        className="border border-border bg-surface"
        style={{ padding: "var(--space-md)", boxShadow: "var(--shadow-sm)" }}
      >
        <h3 className="text-foreground" style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600 }}>
          Why it matters
        </h3>
        <textarea
          value={whyItMatters}
          onChange={(e) => setWhyItMatters(e.target.value)}
          rows={4}
          disabled={busy}
          className="mt-2 w-full border border-border bg-surface text-foreground"
          style={{ padding: "var(--space-md)" }}
        />
      </section>

      <section
        className="border border-border bg-surface"
        style={{ padding: "var(--space-md)", boxShadow: "var(--shadow-sm)" }}
      >
        <h3 className="text-foreground" style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600 }}>
          Facts
        </h3>
        <ul className="mt-2 flex flex-col gap-3" style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {brief.facts.map((fact, index) => (
            <li key={`fact-${index}`}>
              <p className="text-secondary" style={{ margin: 0 }}>
                {fact.text}
              </p>
              <SourceChips sourceIds={fact.sourceIds} sourcesById={sourcesById} />
            </li>
          ))}
        </ul>
      </section>

      <section
        className="border border-border bg-surface"
        style={{ padding: "var(--space-md)", boxShadow: "var(--shadow-sm)" }}
      >
        <h3 className="text-foreground" style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600 }}>
          Analysis
        </h3>
        <ul className="mt-2 flex flex-col gap-3" style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {brief.analysis.map((item, index) => (
            <li key={`analysis-${index}`}>
              <p className="text-muted-foreground" style={{ margin: 0, fontSize: "0.75rem" }}>
                {item.kind}
              </p>
              <p className="text-secondary" style={{ margin: "4px 0 0" }}>
                {item.text}
              </p>
              <SourceChips sourceIds={item.sourceIds} sourcesById={sourcesById} />
            </li>
          ))}
        </ul>
      </section>

      <section
        className="border border-border bg-surface"
        style={{ padding: "var(--space-md)", boxShadow: "var(--shadow-sm)" }}
      >
        <h3 className="text-foreground" style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600 }}>
          Connections
        </h3>
        <ul className="mt-2 flex flex-col gap-3" style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {brief.connections.map((item, index) => (
            <li key={`conn-${index}`}>
              <p className="text-secondary" style={{ margin: 0 }}>
                {item.text}
              </p>
              <SourceChips sourceIds={item.sourceIds} sourcesById={sourcesById} />
            </li>
          ))}
        </ul>
      </section>

      <section
        className="border border-border bg-surface"
        style={{ padding: "var(--space-md)", boxShadow: "var(--shadow-sm)" }}
      >
        <h3 className="text-foreground" style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600 }}>
          Newsletter angles
        </h3>
        <p className="text-muted-foreground" style={{ margin: "var(--space-sm) 0 0", fontSize: "0.8125rem" }}>
          Select an angle to take into draft generation.
        </p>
        <div
          className="mt-3 flex flex-col gap-2"
          role="radiogroup"
          aria-label="Select newsletter angle"
        >
          {brief.angles.map((angle) => {
            const selected = selectedAngleId === angle.id;
            return (
              <button
                key={angle.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={busy}
                onClick={() => onSelectedAngleIdChange(angle.id)}
                className={
                  selected
                    ? "border border-border bg-muted text-left text-foreground"
                    : "border border-border bg-surface text-left text-secondary"
                }
                style={{ padding: "var(--space-md)", minHeight: 44 }}
              >
                <span style={{ fontWeight: 600 }}>{angle.title}</span>
                <span
                  className="block text-muted-foreground"
                  style={{ marginTop: 4, fontSize: "0.875rem" }}
                >
                  {angle.description}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveEdits()}
          className="cursor-pointer border border-border bg-surface text-secondary disabled:opacity-60"
          style={{ minHeight: 44, padding: "0 var(--space-lg)" }}
        >
          Save edits
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void regenerate()}
          className="cursor-pointer border border-border bg-surface text-secondary disabled:opacity-60"
          style={{ minHeight: 44, padding: "0 var(--space-lg)" }}
        >
          {busy ? "Working…" : "Full regenerate"}
        </button>
        <button
          type="button"
          disabled={!canContinue || busy || !selectedAngleId}
          onClick={onContinueToDraft}
          className="cursor-pointer bg-accent text-on-primary disabled:cursor-not-allowed disabled:bg-accent/40"
          style={{ minHeight: 44, padding: "0 var(--space-lg)" }}
        >
          Continue to draft
        </button>
      </div>
      <p className="text-muted-foreground" style={{ margin: 0, fontSize: "0.8125rem" }}>
        Continue carries your selected angle into the draft stage.
      </p>
    </div>
  );
}
