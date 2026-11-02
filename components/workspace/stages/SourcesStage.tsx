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

  const ready = useMemo(() => usableCount(sources), [sources]);
  const canGenerate = ready >= 3;

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

  const ctaHelper = canGenerate
    ? `${ready} ready — generate an evidence-backed brief`
    : `Need 3 ready sources (${ready}/3)`;

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

  return (
    <div className="flex flex-col gap-6">
      {sources.length === 0 ? (
        <EmptyState
          title="Add at least 3 sources to start"
          description="Add a URL, pasted text, or both. Failed fetches become needs_content — paste to recover without inventing body text."
          nextAction="Add usable sources, then generate a research brief in M4"
        />
      ) : null}

      <section
        className="border border-border bg-surface"
        style={{ padding: "var(--space-lg)", boxShadow: "var(--shadow-sm)" }}
        aria-label="Add source form"
      >
        <h3
          className="text-foreground"
          style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600 }}
        >
          Add source
        </h3>
        <form className="mt-4 flex flex-col gap-3" onSubmit={submit}>
          <label className="flex flex-col gap-1 text-sm text-secondary">
            <span className="inline-flex items-center gap-2">
              <Link2 className="size-4" aria-hidden="true" />
              URL
            </span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              disabled={busy}
              className="border border-border bg-surface text-foreground"
              style={{ minHeight: 44, padding: "0 var(--space-md)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-secondary">
            <span className="inline-flex items-center gap-2">
              <FileText className="size-4" aria-hidden="true" />
              Paste content
            </span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Paste article or tweet text…"
              disabled={busy}
              className="border border-border bg-surface text-foreground"
              style={{ padding: "var(--space-md)" }}
            />
          </label>
          {formError ? (
            <p className="text-destructive" role="alert" style={{ margin: 0, fontSize: "0.875rem" }}>
              {formError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="cursor-pointer self-start bg-accent text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
            style={{ minHeight: 44, padding: "0 var(--space-lg)" }}
          >
            {busy ? "Working…" : "Add source"}
          </button>
        </form>
      </section>

      {sources.length > 0 ? (
        <section className="flex flex-col gap-3" aria-label="Source list">
          <div className="flex items-baseline justify-between gap-3">
            <h3
              className="text-foreground"
              style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600 }}
            >
              Sources
            </h3>
            <p className="text-muted-foreground" style={{ margin: 0, fontSize: "0.8125rem" }}>
              {ready} ready
            </p>
          </div>
          {rowError ? (
            <p className="text-destructive" role="alert" style={{ margin: 0, fontSize: "0.875rem" }}>
              {rowError}
            </p>
          ) : null}
          <ul className="flex flex-col gap-3" style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {sources.map((source) => (
              <li
                key={source.id}
                className="border border-border bg-surface"
                style={{ padding: "var(--space-md)", boxShadow: "var(--shadow-sm)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground" style={{ margin: 0, fontWeight: 600 }}>
                      {source.title?.trim() || source.url || "Untitled source"}
                    </p>
                    {source.url ? (
                      <p
                        className="truncate font-mono text-muted-foreground"
                        style={{ margin: "var(--space-xs) 0 0", fontSize: "0.75rem" }}
                      >
                        {source.url}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground" style={{ margin: "var(--space-xs) 0 0", fontSize: "0.8125rem" }}>
                      {source.content.trim().length > 0
                        ? `${source.content.trim().length.toLocaleString()} chars`
                        : "No content yet"}
                      {source.errorMessage ? ` · ${source.errorMessage}` : ""}
                    </p>
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
                        className="inline-flex cursor-pointer items-center gap-1 border border-border bg-surface text-secondary disabled:opacity-60"
                        style={{ minHeight: 44, padding: "0 var(--space-md)" }}
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
                        className="cursor-pointer border border-border bg-surface text-secondary disabled:opacity-60"
                        style={{ minHeight: 44, padding: "0 var(--space-md)" }}
                      >
                        Paste recovery
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(source.id)}
                      className="inline-flex cursor-pointer items-center gap-1 border border-border bg-surface text-destructive disabled:opacity-60"
                      style={{ minHeight: 44, padding: "0 var(--space-md)" }}
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
                      className="border border-border bg-surface text-foreground"
                      style={{ padding: "var(--space-md)" }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void saveRecovery(source.id)}
                        className="cursor-pointer bg-accent text-on-primary disabled:opacity-60"
                        style={{ minHeight: 44, padding: "0 var(--space-md)" }}
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
                        className="cursor-pointer border border-border bg-surface text-secondary"
                        style={{ minHeight: 44, padding: "0 var(--space-md)" }}
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

      <div>
        <p
          className="text-muted-foreground"
          style={{ margin: "0 0 var(--space-sm)", fontSize: "0.8125rem" }}
        >
          Status legend
        </p>
        <div className="flex flex-wrap gap-2">
          <StatusChip status="ready" />
          <StatusChip status="needs_content" />
          <StatusChip status="failed" />
        </div>
      </div>

      <div>
        {generateError ? (
          <p
            className="text-destructive"
            role="alert"
            style={{ margin: "0 0 var(--space-sm)", fontSize: "0.875rem" }}
          >
            {generateError}
          </p>
        ) : null}
        <button
          type="button"
          disabled={!canGenerate || busy}
          onClick={() => void generateBrief()}
          className="cursor-pointer bg-accent text-on-primary disabled:cursor-not-allowed disabled:bg-accent/40"
          style={{
            minHeight: 44,
            padding: "0 var(--space-lg)",
          }}
        >
          {busy ? "Working…" : "Generate research brief"}
        </button>
        <p
          className="text-muted-foreground"
          style={{ margin: "var(--space-sm) 0 0", fontSize: "0.8125rem" }}
        >
          {ctaHelper}
        </p>
      </div>
    </div>
  );
}
