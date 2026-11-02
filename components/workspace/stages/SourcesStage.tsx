"use client";

import { useMemo, useState } from "react";
import { FileText, Link2, RefreshCw, Trash2 } from "lucide-react";
import type { SourceDto } from "@/lib/types/source";
import { EmptyState } from "../EmptyState";
import { StatusChip, type SourceStatusVisual } from "../StatusChip";

type SourcesStageProps = {
  sources: SourceDto[];
  onChanged: () => Promise<void> | void;
  onGenerateBrief: () => Promise<void> | void;
};

type KindFilter = "all" | SourceDto["kind"];

function isStatusChip(status: string): status is SourceStatusVisual {
  return (
    status === "ready" ||
    status === "needs_content" ||
    status === "failed"
  );
}

function usableCount(sources: SourceDto[]): number {
  return sources.filter(
    (s) => s.status === "ready" && s.content.trim().length > 0,
  ).length;
}

export function SourcesStage({
  sources,
  onChanged,
  onGenerateBrief,
}: SourcesStageProps) {
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [recoveryId, setRecoveryId] = useState<string | null>(null);
  const [recoveryText, setRecoveryText] = useState("");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");

  const ready = useMemo(() => usableCount(sources), [sources]);
  const canGenerate = ready >= 3;

  const filtered = useMemo(() => {
    if (kindFilter === "all") return sources;
    return sources.filter((s) => s.kind === kindFilter);
  }, [sources, kindFilter]);

  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = { all: sources.length };
    for (const s of sources) {
      counts[s.kind] = (counts[s.kind] ?? 0) + 1;
    }
    return counts;
  }, [sources]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim() || undefined,
          content: content.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: { message?: string; code?: string };
      };
      if (!res.ok) {
        setFormError(data.error?.message ?? `Add failed (${res.status})`);
        return;
      }
      setUrl("");
      setContent("");
      await onChanged();
    } catch {
      setFormError("Network error while adding source");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setRowError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/sources/${id}`, { method: "DELETE" });
      const data = (await res.json()) as {
        error?: { message?: string };
      };
      if (!res.ok) {
        setRowError(data.error?.message ?? `Delete failed (${res.status})`);
        return;
      }
      await onChanged();
    } catch {
      setRowError("Network error while deleting source");
    } finally {
      setBusy(false);
    }
  };

  const reingest = async (id: string) => {
    setRowError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/sources/${id}/reingest`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setRowError(data.error?.message ?? `Retry failed (${res.status})`);
        return;
      }
      await onChanged();
    } catch {
      setRowError("Network error while retrying fetch");
    } finally {
      setBusy(false);
    }
  };

  const saveRecovery = async (id: string) => {
    setRowError(null);
    if (!recoveryText.trim()) {
      setRowError("Paste some content before saving recovery");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: recoveryText }),
      });
      const data = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setRowError(data.error?.message ?? `Recovery failed (${res.status})`);
        return;
      }
      setRecoveryId(null);
      setRecoveryText("");
      await onChanged();
    } catch {
      setRowError("Network error while saving paste recovery");
    } finally {
      setBusy(false);
    }
  };

  const generateBrief = async () => {
    if (!canGenerate || busy) return;
    setGenerateError(null);
    setBusy(true);
    try {
      await onGenerateBrief();
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Failed to generate brief",
      );
    } finally {
      setBusy(false);
    }
  };

  const filterChips: { id: KindFilter; label: string }[] = [
    { id: "all", label: `All (${kindCounts.all ?? 0})` },
    { id: "url", label: `URL (${kindCounts.url ?? 0})` },
    { id: "paste", label: `Paste (${kindCounts.paste ?? 0})` },
    { id: "tweet", label: `Tweet (${kindCounts.tweet ?? 0})` },
    { id: "other", label: `Other (${kindCounts.other ?? 0})` },
  ];

  return (
    <div className="flex flex-col gap-6">
      {sources.length === 0 ? (
        <EmptyState
          title="Add at least 3 sources to start"
          description="Add a URL, pasted text, or both. Failed fetches become needs_content — paste to recover without inventing body text."
          nextAction="Add usable sources, then generate a research brief"
        />
      ) : null}

      <section
        className="rounded-lg border border-border bg-surface-container-low"
        style={{ padding: "var(--space-lg)", boxShadow: "var(--shadow-sm)" }}
        aria-label="Ingest sources"
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded bg-surface-container px-2 py-1 font-mono text-[11px] text-foreground">
            <span className="size-2 rounded-full bg-secondary" aria-hidden="true" />
            Source dossier
          </span>
          <span className="rounded bg-sage-tint px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-accent">
            {ready} ready
          </span>
        </div>

        <form className="flex flex-col gap-3" onSubmit={submit}>
          <div className="flex flex-col gap-2 rounded border border-border bg-surface p-1 shadow-sm sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Link2
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Ingest URL (article, post, docs…)"
                disabled={busy}
                className="w-full bg-transparent py-3 pr-3 pl-10 font-sans text-[15px] text-foreground placeholder:font-mono placeholder:text-[11px] placeholder:text-muted-foreground focus:outline-none"
                style={{ minHeight: 44 }}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="cursor-pointer rounded bg-primary px-4 font-mono text-[11px] tracking-wide text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
              style={{ minHeight: 44 }}
            >
              {busy ? "Working…" : "Add source"}
            </button>
          </div>

          <label className="flex flex-col gap-1 text-sm text-ink-secondary">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-wide text-muted-foreground">
              <FileText className="size-3.5" aria-hidden="true" />
              Paste content (optional)
            </span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Paste article or tweet text…"
              disabled={busy}
              className="rounded border border-border bg-surface text-foreground focus:border-foreground focus:outline-none"
              style={{ padding: "var(--space-md)" }}
            />
          </label>
          {formError ? (
            <p className="font-mono text-sm text-destructive" role="alert" style={{ margin: 0 }}>
              {formError}
            </p>
          ) : null}
        </form>
      </section>

      {sources.length > 0 ? (
        <section className="flex flex-col gap-4" aria-label="Source list">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by kind">
            {filterChips.map((chip) => {
              const active = kindFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setKindFilter(chip.id)}
                  className={`cursor-pointer rounded px-3 py-1.5 font-mono text-[11px] tracking-wide transition-colors ${
                    active
                      ? "bg-primary text-on-primary shadow-sm"
                      : "bg-surface-container text-ink-secondary hover:bg-surface-container-high hover:text-foreground"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {rowError ? (
            <p className="font-mono text-sm text-destructive" role="alert" style={{ margin: 0 }}>
              {rowError}
            </p>
          ) : null}

          <ul className="flex flex-col gap-3" style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {filtered.map((source) => (
              <li
                key={source.id}
                className="rounded-lg border border-border bg-surface"
                style={{ padding: "var(--space-md)", boxShadow: "var(--shadow-sm)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg text-foreground" style={{ margin: 0 }}>
                      {source.title?.trim() || source.url || "Untitled source"}
                    </p>
                    <div className="mt-2 border-t border-dashed border-border pt-2">
                      {source.url ? (
                        <p
                          className="truncate font-mono text-[10px] tracking-wide text-muted-foreground"
                          style={{ margin: 0 }}
                        >
                          {source.url}
                        </p>
                      ) : null}
                      <p
                        className="font-mono text-[11px] text-ink-secondary"
                        style={{ margin: "4px 0 0" }}
                      >
                        {source.kind} ·{" "}
                        {source.content.trim().length > 0
                          ? `${source.content.trim().length.toLocaleString()} chars`
                          : "No content yet"}
                        {source.errorMessage ? ` · ${source.errorMessage}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isStatusChip(source.status) ? (
                      <StatusChip status={source.status} />
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">
                        {source.status}
                      </span>
                    )}
                    {source.url ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void reingest(source.id)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded border border-border bg-surface px-3 font-mono text-[11px] text-ink-secondary disabled:opacity-60"
                        style={{ minHeight: 40 }}
                        title="Retry fetch"
                      >
                        <RefreshCw className="size-3.5" aria-hidden="true" />
                        Retry
                      </button>
                    ) : null}
                    {source.status === "needs_content" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setRecoveryId(source.id);
                          setRecoveryText("");
                        }}
                        className="cursor-pointer rounded border border-secondary bg-terracotta-tint px-3 font-mono text-[11px] text-secondary disabled:opacity-60"
                        style={{ minHeight: 40 }}
                      >
                        Paste recovery
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(source.id)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded border border-border bg-surface px-3 font-mono text-[11px] text-destructive disabled:opacity-60"
                      style={{ minHeight: 40 }}
                      title="Delete source"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </div>
                {recoveryId === source.id ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <textarea
                      value={recoveryText}
                      onChange={(e) => setRecoveryText(e.target.value)}
                      rows={4}
                      placeholder="Paste the article or tweet body…"
                      disabled={busy}
                      className="rounded border border-border bg-surface text-foreground focus:border-foreground focus:outline-none"
                      style={{ padding: "var(--space-md)" }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void saveRecovery(source.id)}
                        className="cursor-pointer rounded bg-primary px-3 font-mono text-[11px] text-on-primary disabled:opacity-60"
                        style={{ minHeight: 40 }}
                      >
                        Save paste
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setRecoveryId(null);
                          setRecoveryText("");
                        }}
                        className="cursor-pointer rounded border border-border bg-surface px-3 font-mono text-[11px] text-ink-secondary"
                        style={{ minHeight: 40 }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        {generateError ? (
          <p className="font-mono text-sm text-destructive" role="alert" style={{ margin: 0 }}>
            {generateError}
          </p>
        ) : null}
        <button
          type="button"
          disabled={!canGenerate || busy}
          onClick={() => void generateBrief()}
          className="cursor-pointer self-start rounded bg-primary px-5 font-mono text-[11px] tracking-wide text-on-primary disabled:cursor-not-allowed disabled:opacity-40"
          style={{ minHeight: 44 }}
        >
          {busy ? "Working…" : "Generate research brief"}
        </button>
        <p className="font-mono text-[11px] text-muted-foreground" style={{ margin: 0 }}>
          {canGenerate
            ? `${ready} ready — generate an evidence-backed brief`
            : `Need 3 ready sources (${ready}/3)`}
        </p>
      </div>
    </div>
  );
}
