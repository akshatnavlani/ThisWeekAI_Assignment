"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { BriefDto } from "@/lib/types/brief";
import type { DraftDto } from "@/lib/types/draft";
import {
  articlePlainFromSections,
  isHeadlineSection,
  workingPlainFromSections,
} from "@/lib/types/draft";
import type {
  SuggestionCategory,
  SuggestionDto,
  WritingMetrics,
} from "@/lib/types/writing";
import { SUGGESTION_CATEGORIES } from "@/lib/types/writing";
import {
  copyTextToClipboard,
  downloadTextFile,
} from "@/lib/export/markdown";
import { downloadDraftPdf } from "@/lib/export/pdf";
import { computeMetrics } from "@/lib/writing/metrics";
import { MarkdownBody } from "@/components/ui/MarkdownBody";
import { EmptyState } from "../EmptyState";
import { SuggestionMark } from "../SuggestionMark";

type ComposeView = "drafting" | "writing";

type ComposeStageProps = {
  draft: DraftDto | null;
  brief: BriefDto | null;
  suggestions: SuggestionDto[];
  metrics: WritingMetrics | null;
  writingBusy: boolean;
  selectedAngleId: string | null;
  onSelectedAngleIdChange: (angleId: string) => void;
  onDraftChanged: (draft: DraftDto) => void;
  onAnalyzeWriting: (sectionKeys?: string[]) => Promise<void>;
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

function MetricsAside({ metrics }: { metrics: WritingMetrics }) {
  return (
    <aside
      className="rounded-lg border border-border bg-surface shadow-sm"
      style={{ padding: "var(--space-md)" }}
    >
      <h3
        className="font-mono text-[11px] tracking-wide text-muted-foreground"
        style={{ margin: 0 }}
      >
        Live metrics
      </h3>
      <ul className="mt-3 flex flex-col gap-2" style={{ margin: "12px 0 0", padding: 0, listStyle: "none" }}>
        <li className="font-mono text-[12px] text-ink-secondary">
          Words <strong className="text-foreground">{metrics.wordCount}</strong>
        </li>
        <li className="font-mono text-[12px] text-ink-secondary">
          Avg sentence{" "}
          <strong className="text-foreground">
            {metrics.averageSentenceLength}
          </strong>
        </li>
        <li className="font-mono text-[12px] text-ink-secondary">
          Reading{" "}
          <strong className="text-foreground">
            {metrics.readingTimeMinutes} min
          </strong>
        </li>
        <li className="font-mono text-[12px] text-ink-secondary">
          Flesch{" "}
          <strong className="text-foreground">{metrics.readabilityScore}</strong>
        </li>
      </ul>
      <p className="font-mono text-[10px] text-muted-foreground" style={{ margin: "12px 0 0" }}>
        Flesch Reading Ease (0–100, higher = easier). Informational only.
      </p>
    </aside>
  );
}

export function ComposeStage({
  draft,
  brief,
  suggestions,
  writingBusy,
  selectedAngleId,
  onSelectedAngleIdChange,
  onDraftChanged,
  onAnalyzeWriting,
  onAccept,
  onReject,
}: ComposeStageProps) {
  const [view, setView] = useState<ComposeView>("drafting");
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [regenKey, setRegenKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addPurpose, setAddPurpose] = useState("");
  const [addGenerate, setAddGenerate] = useState(false);
  const [changeAngleOpen, setChangeAngleOpen] = useState(false);
  const [pendingAngleId, setPendingAngleId] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [renderedPreview, setRenderedPreview] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [actingId, setActingId] = useState<string | null>(null);
  /** Section content fingerprint from the last successful analyze. */
  const [lastAnalyzedSections, setLastAnalyzedSections] = useState<
    Record<string, string>
  >({});

  const angles = brief?.angles ?? [];
  const awaitingStart = !draft || draft.awaitingStart;

  useEffect(() => {
    if (!selectedAngleId && angles[0]) {
      onSelectedAngleIdChange(angles[0].id);
    }
  }, [angles, selectedAngleId, onSelectedAngleIdChange]);

  useEffect(() => {
    if (!draft) {
      setSectionDrafts({});
      return;
    }
    const next: Record<string, string> = {};
    for (const section of draft.sections) {
      next[section.key] = section.content;
    }
    setSectionDrafts(next);
  }, [draft]);

  useEffect(() => {
    if (!draft || draft.awaitingStart) {
      setLastAnalyzedSections({});
      return;
    }
    // Baseline fingerprints to current content so Drafting ↔ Writing
    // switches do not re-analyze until a section actually changes.
    const next: Record<string, string> = {};
    for (const s of draft.sections) {
      next[s.key] = s.content;
    }
    setLastAnalyzedSections(next);
  }, [draft?.id, draft?.awaitingStart]);

  const effectiveAngleId = selectedAngleId ?? angles[0]?.id ?? null;

  const sectionInputs = useMemo(() => {
    if (!draft || draft.sections.length === 0) return [];
    return draft.sections.map((s) => ({
      key: s.key,
      title: s.title,
      content: sectionDrafts[s.key] ?? s.content,
      sortOrder: s.sortOrder,
    }));
  }, [draft, sectionDrafts]);

  const livePlain = useMemo(
    () => workingPlainFromSections(sectionInputs),
    [sectionInputs],
  );

  const changedSectionKeys = (): string[] => {
    if (!draft) return [];
    const keys: string[] = [];
    for (const s of draft.sections) {
      const content = sectionDrafts[s.key] ?? s.content;
      if (lastAnalyzedSections[s.key] !== content) {
        keys.push(s.key);
      }
    }
    // Removed sections don't need analyze; new keys are already in keys
    return keys;
  };

  const snapshotAnalyzedSections = () => {
    if (!draft) return;
    const next: Record<string, string> = {};
    for (const s of draft.sections) {
      next[s.key] = sectionDrafts[s.key] ?? s.content;
    }
    setLastAnalyzedSections(next);
  };

  const openWritingAssist = () => {
    setView("writing");
    if (!draft || draft.awaitingStart) return;
    if (!livePlain.trim() || writingBusy) return;

    const changed = changedSectionKeys();
    if (changed.length === 0) return;

    void (async () => {
      // Persist unsaved edits so server working_plain matches the canvas
      for (const s of draft.sections) {
        const local = sectionDrafts[s.key] ?? s.content;
        if (local !== s.content) {
          await saveSection(s.key, local);
        }
      }
      try {
        await onAnalyzeWriting(changed);
        snapshotAnalyzedSections();
      } catch {
        // Shell surfaces analyze errors; allow retry on next switch
      }
    })();
  };

  const articlePlain = useMemo(
    () => articlePlainFromSections(sectionInputs),
    [sectionInputs],
  );

  // Always score the live canvas — do not freeze on last analyze payload.
  const displayMetrics = useMemo(() => computeMetrics(livePlain), [livePlain]);

  const pending = useMemo(
    () =>
      suggestions.filter((s) => {
        if (s.status !== "pending") return false;
        if (categoryFilter === "all") return true;
        return s.category === categoryFilter;
      }),
    [suggestions, categoryFilter],
  );

  const selectedAngle = angles.find((a) => a.id === draft?.selectedAngleId);

  const runJson = async <T,>(
    url: string,
    init?: RequestInit,
  ): Promise<T> => {
    const res = await fetch(url, init);
    const text = await res.text();
    if (!text.trim()) {
      throw new Error(
        res.ok
          ? "Empty response from server"
          : `Request failed (${res.status}) with empty body`,
      );
    }
    let data: T & { error?: { message?: string } };
    try {
      data = JSON.parse(text) as T & { error?: { message?: string } };
    } catch {
      throw new Error(
        `Server returned non-JSON (${res.status}): ${text.slice(0, 120)}`,
      );
    }
    if (!res.ok) {
      throw new Error(data.error?.message ?? `Request failed (${res.status})`);
    }
    return data;
  };

  const startStarter = async () => {
    if (!effectiveAngleId) {
      setError("Select a newsletter angle first.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const data = await runJson<{ draft: DraftDto }>("/api/draft/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "starter_draft",
          angleId: effectiveAngleId,
        }),
      });
      onDraftChanged(data.draft);
      setView("drafting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Starter failed");
    } finally {
      setBusy(false);
    }
  };

  const startBlank = async () => {
    if (!effectiveAngleId) {
      setError("Select a newsletter angle first.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const data = await runJson<{ draft: DraftDto }>("/api/draft/blank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ angleId: effectiveAngleId }),
      });
      onDraftChanged(data.draft);
      setView("drafting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Blank draft failed");
    } finally {
      setBusy(false);
    }
  };

  const confirmChangeAngle = async () => {
    const angleId = pendingAngleId ?? effectiveAngleId;
    if (!angleId) return;
    setBusy(true);
    setError(null);
    try {
      const data = await runJson<{ draft: DraftDto }>(
        "/api/draft/change-angle",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ angleId }),
        },
      );
      onDraftChanged(data.draft);
      onSelectedAngleIdChange(angleId);
      setChangeAngleOpen(false);
      setPendingAngleId(null);
      setView("drafting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Change angle failed");
    } finally {
      setBusy(false);
    }
  };

  const saveSection = async (key: string, content: string) => {
    try {
      const data = await runJson<{ draft: DraftDto }>(
        `/api/draft/sections/${encodeURIComponent(key)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );
      onDraftChanged(data.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const regenerate = async (key: string) => {
    setRegenKey(key);
    setError(null);
    try {
      const data = await runJson<{ draft: DraftDto }>(
        `/api/draft/sections/${encodeURIComponent(key)}/regenerate`,
        { method: "POST" },
      );
      onDraftChanged(data.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setRegenKey(null);
    }
  };

  const removeSection = async (key: string) => {
    if (!window.confirm("Remove this section?")) return;
    setError(null);
    try {
      const data = await runJson<{ draft: DraftDto }>(
        `/api/draft/sections/${encodeURIComponent(key)}`,
        { method: "DELETE" },
      );
      onDraftChanged(data.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    }
  };

  const addSection = async () => {
    if (addGenerate && !addPurpose.trim()) {
      setError("Purpose is required when generating a section.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await runJson<{ draft: DraftDto }>("/api/draft/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: addTitle.trim(),
          purpose: addPurpose.trim() || undefined,
          generate: addGenerate,
        }),
      });
      onDraftChanged(data.draft);
      setAddOpen(false);
      setAddTitle("");
      setAddPurpose("");
      setAddGenerate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add section failed");
    } finally {
      setBusy(false);
    }
  };

  const moveSection = async (key: string, direction: -1 | 1) => {
    if (!draft) return;
    const ordered = [...draft.sections]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => s.key);
    const index = ordered.indexOf(key);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= ordered.length) return;
    const swapped = [...ordered];
    const tmp = swapped[index]!;
    swapped[index] = swapped[next]!;
    swapped[next] = tmp;
    setError(null);
    try {
      const data = await runJson<{ draft: DraftDto }>(
        "/api/draft/sections/reorder",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedKeys: swapped }),
        },
      );
      onDraftChanged(data.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reorder failed");
    }
  };

  const exportActions = async (kind: "md" | "pdf" | "copy") => {
    setExportBusy(true);
    try {
      if (!articlePlain.trim()) return;
      if (kind === "copy") await copyTextToClipboard(articlePlain);
      if (kind === "md") downloadTextFile("editorial-draft.md", articlePlain);
      if (kind === "pdf") await downloadDraftPdf(articlePlain);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportBusy(false);
    }
  };

  if (!brief || angles.length === 0) {
    return (
      <EmptyState
        title="Compose needs a research brief"
        description="Generate a research brief with newsletter angles first."
        nextAction="Research stage → Generate research brief"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p className="font-mono text-sm text-destructive" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      ) : null}

      {awaitingStart ? (
        <section
          className="rounded-lg border border-border bg-surface shadow-sm"
          style={{ padding: "var(--space-lg)" }}
        >
          <h2 className="font-display text-xl text-foreground" style={{ margin: 0 }}>
            How do you want to begin?
          </h2>
          <p className="font-mono text-[12px] text-ink-secondary" style={{ margin: "8px 0 0" }}>
            Pick an angle, then open an empty canvas or let the model draft a first pass.
          </p>
          <fieldset className="mt-4 flex flex-col gap-3" style={{ marginTop: 16, border: 0, padding: 0 }}>
            <legend className="font-mono text-[11px] tracking-wide text-muted-foreground">
              Newsletter angle
            </legend>
            {angles.map((angle) => (
              <label
                key={angle.id}
                className="flex cursor-pointer gap-3 rounded border border-border bg-surface-subtle p-3"
              >
                <input
                  type="radio"
                  name="compose-angle"
                  checked={effectiveAngleId === angle.id}
                  onChange={() => onSelectedAngleIdChange(angle.id)}
                  className="mt-1"
                />
                <span>
                  <span className="block font-sans text-[15px] text-foreground">
                    {angle.title}
                  </span>
                  <span className="mt-1 block font-mono text-[11px] text-ink-secondary">
                    {angle.description}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="mt-5 flex flex-wrap gap-3" style={{ marginTop: 20 }}>
            <button
              type="button"
              disabled={busy || !effectiveAngleId}
              onClick={() => void startBlank()}
              className="cursor-pointer rounded border border-border px-4 font-mono text-[11px] text-ink-secondary disabled:opacity-60"
              style={{ minHeight: 44 }}
            >
              {busy ? "Working…" : "Blank canvas"}
            </button>
            <button
              type="button"
              disabled={busy || !effectiveAngleId}
              onClick={() => void startStarter()}
              className="cursor-pointer rounded bg-primary px-4 font-mono text-[11px] tracking-wide text-on-primary disabled:opacity-60"
              style={{ minHeight: 44 }}
            >
              {busy ? "Working…" : "Starter draft"}
            </button>
          </div>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded border border-border bg-surface-subtle p-0.5">
              <button
                type="button"
                onClick={() => setView("drafting")}
                className={`rounded px-3 py-1.5 font-mono text-[11px] ${
                  view === "drafting"
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                Drafting
              </button>
              <button
                type="button"
                onClick={() => openWritingAssist()}
                className={`rounded px-3 py-1.5 font-mono text-[11px] ${
                  view === "writing"
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                Writing assist
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setPendingAngleId(effectiveAngleId);
                setChangeAngleOpen(true);
              }}
              className="cursor-pointer rounded border border-border px-3 font-mono text-[11px] text-ink-secondary"
              style={{ minHeight: 36 }}
              title="Clear this draft and choose Blank or Starter again"
            >
              Start over
            </button>
            {view === "drafting" ? (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1 rounded border border-secondary bg-terracotta-tint px-3 font-mono text-[11px] text-secondary"
                style={{ minHeight: 36 }}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add section
              </button>
            ) : (
              <button
                type="button"
                disabled={writingBusy || !livePlain.trim()}
                onClick={() => {
                  void (async () => {
                    await onAnalyzeWriting();
                    snapshotAnalyzedSections();
                  })();
                }}
                className="cursor-pointer rounded border border-secondary bg-terracotta-tint px-3 font-mono text-[11px] text-secondary disabled:opacity-60"
                style={{ minHeight: 36 }}
              >
                {writingBusy ? "Analyzing…" : "Analyze writing"}
              </button>
            )}
            <details className="relative">
              <summary
                className="inline-flex cursor-pointer list-none items-center gap-1 rounded border border-border px-3 font-mono text-[11px] text-ink-secondary marker:content-none [&::-webkit-details-marker]:hidden"
                style={{ minHeight: 36 }}
              >
                <Download className="size-3.5" aria-hidden="true" />
                Export
              </summary>
              <div className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded border border-border bg-surface p-1 shadow-md">
                <button
                  type="button"
                  disabled={exportBusy || !articlePlain.trim()}
                  onClick={() => void exportActions("copy")}
                  className="block w-full cursor-pointer rounded px-3 py-2 text-left font-mono text-[11px] text-ink-secondary hover:bg-surface-subtle disabled:opacity-60"
                >
                  Copy MD
                </button>
                <button
                  type="button"
                  disabled={exportBusy || !articlePlain.trim()}
                  onClick={() => void exportActions("md")}
                  className="block w-full cursor-pointer rounded px-3 py-2 text-left font-mono text-[11px] text-ink-secondary hover:bg-surface-subtle disabled:opacity-60"
                >
                  Download .md
                </button>
                <button
                  type="button"
                  disabled={exportBusy || !articlePlain.trim()}
                  onClick={() => void exportActions("pdf")}
                  className="block w-full cursor-pointer rounded px-3 py-2 text-left font-mono text-[11px] text-ink-secondary hover:bg-surface-subtle disabled:opacity-60"
                >
                  Download PDF
                </button>
              </div>
            </details>
          </div>

          {selectedAngle ? (
            <p className="font-mono text-[11px] text-muted-foreground" style={{ margin: 0 }}>
              Angle: <span className="text-ink-secondary">{selectedAngle.title}</span>
              {" · "}
              <button
                type="button"
                onClick={() => {
                  setPendingAngleId(effectiveAngleId);
                  setChangeAngleOpen(true);
                }}
                className="cursor-pointer border-0 bg-transparent p-0 font-mono text-[11px] text-ink-secondary underline-offset-2 hover:underline"
              >
                {draft?.isAiStarter ? "AI-assisted starter" : "Blank canvas"}
              </button>
            </p>
          ) : null}

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              {view === "drafting" ? (
                draft!.sections.map((section) => {
                  const headline = isHeadlineSection(section);
                  return (
                    <section
                      key={section.key}
                      className="rounded-lg border border-border bg-surface shadow-sm"
                      style={{ padding: "var(--space-md)" }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p
                            className="font-mono text-[11px] tracking-wide text-muted-foreground"
                            style={{ margin: 0 }}
                          >
                            {section.title}
                          </p>
                          {section.purpose ? (
                            <p
                              className="font-mono text-[10px] text-ink-secondary"
                              style={{ margin: "4px 0 0" }}
                            >
                              {section.purpose}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy || section.sortOrder === 0}
                            onClick={() => void moveSection(section.key, -1)}
                            className="inline-flex cursor-pointer items-center rounded border border-border px-2 font-mono text-[11px] text-ink-secondary disabled:opacity-40"
                            style={{ minHeight: 36 }}
                            aria-label={`Move ${section.title} up`}
                          >
                            <ChevronUp className="size-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            disabled={
                              busy ||
                              section.sortOrder >= draft!.sections.length - 1
                            }
                            onClick={() => void moveSection(section.key, 1)}
                            className="inline-flex cursor-pointer items-center rounded border border-border px-2 font-mono text-[11px] text-ink-secondary disabled:opacity-40"
                            style={{ minHeight: 36 }}
                            aria-label={`Move ${section.title} down`}
                          >
                            <ChevronDown className="size-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            disabled={busy || regenKey !== null}
                            onClick={() => void regenerate(section.key)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded border border-secondary bg-terracotta-tint px-3 font-mono text-[11px] text-secondary disabled:opacity-60"
                            style={{ minHeight: 36 }}
                          >
                            <RefreshCw className="size-3.5" aria-hidden="true" />
                            {regenKey === section.key
                              ? "Working…"
                              : section.key === "sources"
                                ? "Refresh citations"
                                : "Generate"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void removeSection(section.key)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded border border-border px-3 font-mono text-[11px] text-destructive disabled:opacity-60"
                            style={{ minHeight: 36 }}
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                            Remove
                          </button>
                        </div>
                      </div>
                      {headline ? (
                        <input
                          value={sectionDrafts[section.key] ?? ""}
                          onChange={(e) =>
                            setSectionDrafts((prev) => ({
                              ...prev,
                              [section.key]: e.target.value,
                            }))
                          }
                          onBlur={() =>
                            void saveSection(
                              section.key,
                              sectionDrafts[section.key] ?? "",
                            )
                          }
                          className="mt-3 w-full border-0 border-b border-border bg-transparent font-display text-2xl text-foreground focus:border-foreground focus:outline-none sm:text-3xl"
                          placeholder="Headline"
                          aria-label="Headline"
                        />
                      ) : (
                        <textarea
                          value={sectionDrafts[section.key] ?? ""}
                          onChange={(e) =>
                            setSectionDrafts((prev) => ({
                              ...prev,
                              [section.key]: e.target.value,
                            }))
                          }
                          onBlur={() =>
                            void saveSection(
                              section.key,
                              sectionDrafts[section.key] ?? "",
                            )
                          }
                          rows={5}
                          className="mt-3 w-full rounded border border-border bg-surface font-sans text-[15px] leading-relaxed text-foreground focus:border-foreground focus:outline-none"
                          style={{ padding: "var(--space-md)" }}
                          aria-label={section.title}
                        />
                      )}
                    </section>
                  );
                })
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRenderedPreview(false);
                        setCompare(false);
                      }}
                      className={`rounded px-2.5 py-1 font-mono text-[11px] ${
                        !renderedPreview && !compare
                          ? "bg-surface text-foreground shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      Edit canvas
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCompare(true);
                        setRenderedPreview(false);
                      }}
                      className={`rounded px-2.5 py-1 font-mono text-[11px] ${
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
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCategoryFilter("all")}
                      className={`rounded border px-2.5 py-1 font-mono text-[11px] ${
                        categoryFilter === "all"
                          ? "border-foreground text-foreground"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      All ({suggestions.filter((s) => s.status === "pending").length})
                    </button>
                    {SUGGESTION_CATEGORIES.map((cat) => {
                      const count = suggestions.filter(
                        (s) => s.status === "pending" && s.category === cat,
                      ).length;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategoryFilter(cat)}
                          className={`rounded border px-2.5 py-1 font-mono text-[11px] capitalize ${
                            categoryFilter === cat
                              ? "border-foreground text-foreground"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {cat} ({count})
                        </button>
                      );
                    })}
                  </div>
                  <section
                    className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-8"
                    aria-label={
                      compare
                        ? "Compare"
                        : renderedPreview
                          ? "Markdown preview"
                          : "Draft with highlights"
                    }
                  >
                    {compare ? (
                      <div className="grid gap-6 md:grid-cols-2">
                        <div>
                          <h3 className="font-mono text-[11px] text-muted-foreground">
                            Original
                          </h3>
                          <MarkdownBody
                            content={draft?.originalSnapshot || livePlain}
                          />
                        </div>
                        <div>
                          <h3 className="font-mono text-[11px] text-muted-foreground">
                            Revised
                          </h3>
                          <MarkdownBody content={articlePlain} />
                        </div>
                      </div>
                    ) : renderedPreview ? (
                      <MarkdownBody content={articlePlain} />
                    ) : (
                      <HighlightedDraft
                        text={livePlain}
                        pending={pending}
                        busy={writingBusy || actingId !== null}
                        actingId={actingId}
                        onAccept={async (id) => {
                          setActingId(id);
                          try {
                            await onAccept(id);
                          } finally {
                            setActingId(null);
                          }
                        }}
                        onReject={async (id) => {
                          setActingId(id);
                          try {
                            await onReject(id);
                          } finally {
                            setActingId(null);
                          }
                        }}
                      />
                    )}
                  </section>
                </>
              )}
            </div>
            <div className="w-full shrink-0 lg:w-56">
              <MetricsAside metrics={displayMetrics} />
            </div>
          </div>
        </>
      )}

      {addOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Add section"
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-surface shadow-lg"
            style={{ padding: "var(--space-lg)" }}
          >
            <h3 className="font-display text-lg text-foreground" style={{ margin: 0 }}>
              Add section
            </h3>
            <label className="mt-4 block font-mono text-[11px] text-muted-foreground">
              Name
              <input
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 font-sans text-[15px] text-foreground"
              />
            </label>
            <label className="mt-3 flex items-center gap-2 font-mono text-[11px] text-ink-secondary">
              <input
                type="checkbox"
                checked={addGenerate}
                onChange={(e) => setAddGenerate(e.target.checked)}
              />
              Generate this section after create
            </label>
            {addGenerate ? (
              <label className="mt-3 block font-mono text-[11px] text-muted-foreground">
                Purpose
                <textarea
                  value={addPurpose}
                  onChange={(e) => setAddPurpose(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 font-sans text-[15px] text-foreground"
                  placeholder="What should this section accomplish?"
                />
              </label>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded border border-border px-3 font-mono text-[11px] text-ink-secondary"
                style={{ minHeight: 40 }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  busy ||
                  !addTitle.trim() ||
                  (addGenerate && !addPurpose.trim())
                }
                onClick={() => void addSection()}
                className="rounded bg-primary px-3 font-mono text-[11px] text-on-primary disabled:opacity-60"
                style={{ minHeight: 40 }}
              >
                {busy ? "Working…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {changeAngleOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Start over"
        >
          <div
            className="w-full max-w-lg rounded-lg border border-border bg-surface shadow-lg"
            style={{ padding: "var(--space-lg)" }}
          >
            <h3 className="font-display text-lg text-foreground" style={{ margin: 0 }}>
              Start over
            </h3>
            <p className="font-mono text-[12px] text-ink-secondary" style={{ margin: "8px 0 0" }}>
              Clears the current draft and writing suggestions, then returns you to
              Blank canvas and Starter draft.
            </p>
            <fieldset className="mt-4 flex flex-col gap-2" style={{ border: 0, padding: 0 }}>
              <legend className="mb-2 font-mono text-[11px] tracking-wide text-muted-foreground">
                Newsletter angle
              </legend>
              {angles.map((angle) => (
                <label
                  key={angle.id}
                  className="flex cursor-pointer gap-3 rounded border border-border p-3"
                >
                  <input
                    type="radio"
                    name="change-angle"
                    checked={(pendingAngleId ?? effectiveAngleId) === angle.id}
                    onChange={() => setPendingAngleId(angle.id)}
                  />
                  <span className="font-sans text-[14px] text-foreground">
                    {angle.title}
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded border border-dashed border-border px-3 py-2 font-mono text-[11px] text-muted-foreground">
                Blank canvas
              </div>
              <div className="rounded border border-dashed border-border px-3 py-2 font-mono text-[11px] text-muted-foreground">
                Starter draft
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setChangeAngleOpen(false)}
                className="rounded border border-border px-3 font-mono text-[11px] text-ink-secondary"
                style={{ minHeight: 40 }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmChangeAngle()}
                className="rounded bg-primary px-3 font-mono text-[11px] text-on-primary disabled:opacity-60"
                style={{ minHeight: 40 }}
              >
                {busy ? "Working…" : "Clear and continue"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
