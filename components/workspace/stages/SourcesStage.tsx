"use client";

import { useMemo, useRef, useState } from "react";
import {
  FileText,
  ImagePlus,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { SourceDto } from "@/lib/types/source";
import {
  contentPreview,
  displaySourceTitle,
} from "@/lib/sources/displayTitle";
import { sourceErrorTitle } from "@/lib/sources/errorCopy";
import { parseMentionedUrlsFromMeta } from "@/lib/ingestion/extractMentionedUrls";
import { EmptyState } from "../EmptyState";
import { StatusChip, type SourceStatusVisual } from "../StatusChip";

type SourcesStageProps = {
  sources: SourceDto[];
  onChanged: () => Promise<void> | void;
  onGenerateBrief: () => Promise<void> | void;
  onStartNewProject: () => Promise<void> | void;
};

type KindFilter = "all" | "article" | "tweet" | "other";

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
  onStartNewProject,
}: SourcesStageProps) {
  const [content, setContent] = useState("");
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [recoveryId, setRecoveryId] = useState<string | null>(null);
  const [recoveryText, setRecoveryText] = useState("");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const formImageRef = useRef<HTMLInputElement | null>(null);

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
    setFormNotice(null);
    if (!content.trim() && !attachFile) {
      setFormError("Paste notes and/or links (optional image).");
      return;
    }
    setBusy(true);
    try {
      // Image-only upload: create a paste stub then attach file
      if (!content.trim() && attachFile) {
        const res = await fetch("/api/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "(Image-only source — add notes if needed)",
          }),
        });
        const data = (await res.json()) as {
          error?: { message?: string };
          source?: SourceDto;
        };
        if (!res.ok || !data.source) {
          setFormError(data.error?.message ?? `Add failed (${res.status})`);
          return;
        }
        const body = new FormData();
        body.append("file", attachFile);
        const imgRes = await fetch(`/api/sources/${data.source.id}/image`, {
          method: "POST",
          body,
        });
        if (!imgRes.ok) {
          const imgData = (await imgRes.json()) as { error?: { message?: string } };
          setFormError(imgData.error?.message ?? "Image upload failed");
        }
        setAttachFile(null);
        if (formImageRef.current) formImageRef.current.value = "";
        await onChanged();
        return;
      }

      const res = await fetch("/api/sources/mixed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: content.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: { message?: string; code?: string };
        sources?: SourceDto[];
        skipped?: Array<{ url: string; reason: string }>;
        primarySourceId?: string;
      };
      if (!res.ok || !data.sources?.length) {
        setFormError(data.error?.message ?? `Add failed (${res.status})`);
        return;
      }

      const primaryId = data.primarySourceId ?? data.sources[0]!.id;
      if (attachFile) {
        const body = new FormData();
        body.append("file", attachFile);
        const imgRes = await fetch(`/api/sources/${primaryId}/image`, {
          method: "POST",
          body,
        });
        if (!imgRes.ok) {
          const imgData = (await imgRes.json()) as {
            error?: { message?: string };
          };
          setFormError(
            imgData.error?.message ??
              `Added ${data.sources.length} source(s); image upload failed — retry from the card`,
          );
          setContent("");
          setAttachFile(null);
          if (formImageRef.current) formImageRef.current.value = "";
          await onChanged();
          return;
        }
      }

      const skippedN = data.skipped?.length ?? 0;
      setFormNotice(
        skippedN > 0
          ? `Added ${data.sources.length} source(s); skipped ${skippedN} duplicate/invalid link(s).`
          : `Added ${data.sources.length} source(s).`,
      );
      setContent("");
      setAttachFile(null);
      if (formImageRef.current) formImageRef.current.value = "";
      await onChanged();
    } catch {
      setFormError("Network error while adding source");
    } finally {
      setBusy(false);
    }
  };

  const addMentioned = async (source: SourceDto, urls: string[]) => {
    setRowError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/sources/mixed", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: source.id, urls }),
      });
      const data = (await res.json()) as {
        error?: { message?: string };
        sources?: SourceDto[];
        skipped?: Array<{ url: string; reason: string }>;
      };
      if (!res.ok) {
        setRowError(data.error?.message ?? `Add mentioned failed (${res.status})`);
        return;
      }
      const added = data.sources?.length ?? 0;
      const skipped = data.skipped?.length ?? 0;
      if (added === 0 && skipped > 0) {
        setRowError("Those links are already in the project (or invalid).");
      }
      await onChanged();
    } catch {
      setRowError("Network error while adding mentioned sources");
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

  const uploadImage = async (id: string, file: File) => {
    setRowError(null);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/sources/${id}/image`, {
        method: "POST",
        body,
      });
      const data = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setRowError(data.error?.message ?? `Upload failed (${res.status})`);
        return;
      }
      await onChanged();
    } catch {
      setRowError("Network error while uploading image");
    } finally {
      setBusy(false);
    }
  };

  const removeImage = async (id: string) => {
    setRowError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/sources/${id}/image`, { method: "DELETE" });
      const data = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setRowError(data.error?.message ?? `Remove image failed (${res.status})`);
        return;
      }
      await onChanged();
    } catch {
      setRowError("Network error while removing image");
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
    { id: "article", label: `Article (${kindCounts.article ?? 0})` },
    { id: "tweet", label: `Tweet (${kindCounts.tweet ?? 0})` },
    { id: "other", label: `Other (${kindCounts.other ?? 0})` },
  ];

  return (
    <div className="flex flex-col gap-6">
      {sources.length === 0 ? (
        <EmptyState
          title="Add at least 3 sources to start"
          description="Add a URL, pasted text, or both. Failed fetches become needs_content — paste to recover without inventing body text. Sources are treated as given evidence; this app does not fact-check them."
          nextAction="Add usable sources, then generate a research brief"
        />
      ) : null}

      <section
        className="rounded-lg border border-border bg-surface-container-low"
        style={{ padding: "var(--space-lg)", boxShadow: "var(--shadow-sm)" }}
        aria-label="Ingest sources"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="font-display text-xl text-foreground" style={{ margin: 0 }}>
              Sources
            </h2>
            <span className="font-mono text-[11px] text-muted-foreground">
              {ready} ready
            </span>
          </div>
          <button
            type="button"
            disabled={busy || resetBusy}
            onClick={() => {
              if (
                !window.confirm(
                  "Start a new project from scratch? This clears all sources, research, and draft for this workspace.",
                )
              ) {
                return;
              }
              setResetBusy(true);
              setFormError(null);
              setFormNotice(null);
              setContent("");
              setAttachFile(null);
              if (formImageRef.current) formImageRef.current.value = "";
              void Promise.resolve(onStartNewProject()).finally(() => {
                setResetBusy(false);
              });
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-border px-3 font-mono text-[11px] text-ink-secondary hover:bg-surface disabled:opacity-60"
            style={{ minHeight: 36 }}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            {resetBusy ? "Starting…" : "New project"}
          </button>
        </div>
        <form
          className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm"
          onSubmit={submit}
        >
          <label className="flex flex-col gap-1 text-sm text-ink-secondary">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-wide text-muted-foreground">
              <FileText className="size-3.5" aria-hidden="true" />
              Source input
            </span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="Paste article text, notes, and/or links (articles, tweets, images)…"
              disabled={busy}
              className="rounded border border-border bg-surface-subtle text-foreground focus:border-foreground focus:outline-none"
              style={{ padding: "var(--space-md)" }}
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={formImageRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                setAttachFile(e.target.files?.[0] ?? null);
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => formImageRef.current?.click()}
              className="inline-flex cursor-pointer items-center gap-1 rounded border border-border px-3 font-mono text-[11px] text-ink-secondary disabled:opacity-60"
              style={{ minHeight: 40 }}
            >
              <ImagePlus className="size-3.5" aria-hidden="true" />
              {attachFile ? "Change image" : "Attach image"}
            </button>
            {attachFile ? (
              <>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {attachFile.name}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setAttachFile(null);
                    if (formImageRef.current) formImageRef.current.value = "";
                  }}
                  className="cursor-pointer font-mono text-[11px] text-destructive"
                >
                  Remove
                </button>
              </>
            ) : (
              <span className="font-mono text-[10px] text-muted-foreground">
                Optional · JPEG/PNG/WebP/GIF · max 2 MB
              </span>
            )}
          </div>

          {formError ? (
            <p className="font-mono text-sm text-destructive" role="alert" style={{ margin: 0 }}>
              {formError}
            </p>
          ) : null}
          {formNotice ? (
            <p className="font-mono text-[11px] text-ink-secondary" style={{ margin: 0 }}>
              {formNotice}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="cursor-pointer self-start rounded bg-primary px-5 font-mono text-[11px] tracking-wide text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
            style={{ minHeight: 44 }}
          >
            {busy ? "Working…" : "Add source(s)"}
          </button>
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
                  className={`cursor-pointer rounded border px-3 py-1.5 font-mono text-[11px] transition-colors ${
                    active
                      ? "border-border bg-surface text-foreground shadow-sm"
                      : "border-transparent bg-transparent text-muted-foreground hover:bg-surface-subtle hover:text-foreground"
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
            {filtered.map((source) => {
              const errTitle =
                source.status === "ready"
                  ? null
                  : sourceErrorTitle(source.errorMessage);
              const mentioned = parseMentionedUrlsFromMeta(source.rawMetaJson).filter(
                (u) => !sources.some((s) => s.url === u),
              );
              return (
                <li
                  key={source.id}
                  className="rounded-lg border border-border bg-surface"
                  style={{ padding: "var(--space-md)", boxShadow: "var(--shadow-sm)" }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 gap-3">
                      {source.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={source.imageUrl}
                          alt=""
                          className="size-14 shrink-0 rounded border border-border object-cover"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-lg text-foreground" style={{ margin: 0 }}>
                          {displaySourceTitle(source)}
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
                          {contentPreview(source.content) ? (
                            <p
                              className="mt-1 font-sans text-[13px] leading-snug text-ink-secondary"
                              style={{ margin: "6px 0 0" }}
                            >
                              {contentPreview(source.content)}
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
                          </p>
                          {errTitle ? (
                            <p
                              className="font-mono text-[11px] text-destructive"
                              style={{ margin: "4px 0 0" }}
                              title={source.errorMessage ?? undefined}
                            >
                              {errTitle}
                              {source.errorMessage &&
                              source.errorMessage !== errTitle
                                ? ` · ${source.errorMessage}`
                                : ""}
                            </p>
                          ) : null}
                          {mentioned.length > 0 ? (
                            <div className="mt-2 flex flex-col gap-1">
                              <p
                                className="font-mono text-[11px] text-ink-secondary"
                                style={{ margin: 0 }}
                              >
                                Mentions {mentioned.length} other link
                                {mentioned.length === 1 ? "" : "s"} not yet in
                                the project
                              </p>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void addMentioned(source, mentioned)
                                }
                                className="cursor-pointer self-start rounded border border-secondary bg-terracotta-tint px-3 font-mono text-[11px] text-secondary disabled:opacity-60"
                                style={{ minHeight: 36 }}
                              >
                                Add mentioned as sources
                              </button>
                            </div>
                          ) : null}
                        </div>
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
                      <input
                        ref={(el) => {
                          fileRefs.current[source.id] = el;
                        }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) void uploadImage(source.id, file);
                        }}
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => fileRefs.current[source.id]?.click()}
                        className="inline-flex cursor-pointer items-center gap-1 rounded border border-border bg-surface px-3 font-mono text-[11px] text-ink-secondary disabled:opacity-60"
                        style={{ minHeight: 40 }}
                        title="Upload image"
                      >
                        <ImagePlus className="size-3.5" aria-hidden="true" />
                        Image
                      </button>
                      {source.imageUrl ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void removeImage(source.id)}
                          className="cursor-pointer rounded border border-border px-3 font-mono text-[11px] text-muted-foreground disabled:opacity-60"
                          style={{ minHeight: 40 }}
                        >
                          Clear image
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
              );
            })}
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
