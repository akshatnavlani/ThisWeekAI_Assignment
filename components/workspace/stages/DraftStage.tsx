"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { BriefDto } from "@/lib/types/brief";
import type { DraftDto, DraftMode, DraftSectionKey } from "@/lib/types/draft";
import {
  DRAFT_SECTION_KEYS,
  DRAFT_SECTION_TITLES,
} from "@/lib/types/draft";
import { MarkdownBody } from "@/components/ui/MarkdownBody";
import { EmptyState } from "../EmptyState";

type DraftStageProps = {
  draft: DraftDto | null;
  brief: BriefDto | null;
  selectedAngleId: string | null;
  onSelectedAngleIdChange: (angleId: string) => void;
  onDraftChanged: (draft: DraftDto) => void;
  onAnalyzeWriting: () => Promise<void>;
};

function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function DraftStage({
  draft,
  brief,
  selectedAngleId,
  onSelectedAngleIdChange,
  onDraftChanged,
  onAnalyzeWriting,
}: DraftStageProps) {
  const [mode, setMode] = useState<Extract<DraftMode, "starter_draft" | "outline_only">>(
    draft?.mode === "outline_only" ? "outline_only" : "starter_draft",
  );
  const [angleOverride, setAngleOverride] = useState("");
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, string>>({});
  const [previewKeys, setPreviewKeys] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [regenKey, setRegenKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const angles = brief?.angles ?? [];

  useEffect(() => {
    if (draft?.mode === "outline_only" || draft?.mode === "starter_draft") {
      setMode(draft.mode);
    }
  }, [draft?.mode]);

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

  const effectiveAngleId = selectedAngleId ?? angles[0]?.id ?? null;

  const label = useMemo(() => {
    if (!draft) return null;
    if (draft.mode === "outline_only") return "Outline";
    if (draft.isAiStarter) return "AI-assisted starter";
    return null;
  }, [draft]);

  const generate = async () => {
    if (!effectiveAngleId) {
      setError("Select a newsletter angle before generating.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/draft/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          angleId: effectiveAngleId,
          ...(angleOverride.trim()
            ? { angleOverride: angleOverride.trim() }
            : {}),
        }),
      });
      const data = (await res.json()) as {
        error?: { message?: string };
        draft?: DraftDto;
      };
      if (!res.ok || !data.draft) {
        setError(data.error?.message ?? `Generate failed (${res.status})`);
        return;
      }
      onDraftChanged(data.draft);
    } catch {
      setError("Network error while generating draft");
    } finally {
      setBusy(false);
    }
  };

  const saveSection = async (key: DraftSectionKey, content: string) => {
    if (!draft) return;
    const previous = draft.sections.find((s) => s.key === key)?.content ?? "";
    if (content === previous) return;

    setError(null);
    try {
      const res = await fetch(`/api/draft/sections/${key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = (await res.json()) as {
        error?: { message?: string };
        draft?: DraftDto;
      };
      if (!res.ok || !data.draft) {
        setError(data.error?.message ?? `Save failed (${res.status})`);
        return;
      }
      onDraftChanged(data.draft);
    } catch {
      setError("Network error while saving section");
    }
  };

  const regenerateSection = async (key: DraftSectionKey) => {
    setError(null);
    setRegenKey(key);
    try {
      const res = await fetch(`/api/draft/sections/${key}/regenerate`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        error?: { message?: string };
        draft?: DraftDto;
      };
      if (!res.ok || !data.draft) {
        setError(data.error?.message ?? `Regenerate failed (${res.status})`);
        return;
      }
      onDraftChanged(data.draft);
    } catch {
      setError("Network error while regenerating section");
    } finally {
      setRegenKey(null);
    }
  };

  const hasAngles = angles.length >= 1;
  const workingWords = wordCount(draft?.workingPlain ?? "");

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {error ? (
          <p className="font-mono text-sm text-destructive" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        ) : null}

        {!draft ? (
          <EmptyState
            title="No draft yet"
            description="Choose a mode and newsletter angle, then generate a starter draft or outline. Section regenerate is separate from writing suggestions."
            nextAction="Pick an angle and generate a draft"
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex rounded-lg bg-surface-container p-0.5"
            role="group"
            aria-label="Draft mode"
          >
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode("starter_draft")}
              className={`rounded px-3 font-mono text-[11px] tracking-wide ${
                mode === "starter_draft"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={{ minHeight: 40 }}
              aria-pressed={mode === "starter_draft"}
            >
              Starter draft
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode("outline_only")}
              className={`rounded px-3 font-mono text-[11px] tracking-wide ${
                mode === "outline_only"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={{ minHeight: 40 }}
              aria-pressed={mode === "outline_only"}
            >
              Outline only
            </button>
          </div>

          {label ? (
            <span className="rounded border border-border bg-surface-subtle px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-ink-secondary">
              {label}
            </span>
          ) : null}
        </div>

        {hasAngles ? (
          <section
            className="rounded-lg border border-border bg-surface"
            style={{ padding: "var(--space-md)", boxShadow: "var(--shadow-sm)" }}
          >
            <h3 className="font-display text-xl text-foreground" style={{ margin: 0 }}>
              Newsletter angle
            </h3>
            <div
              className="mt-3 flex flex-col gap-2"
              role="radiogroup"
              aria-label="Select angle"
            >
              {angles.map((angle) => {
                const selected = effectiveAngleId === angle.id;
                return (
                  <button
                    key={angle.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={busy}
                    onClick={() => onSelectedAngleIdChange(angle.id)}
                    className={`rounded-lg border text-left ${
                      selected
                        ? "border-secondary bg-terracotta-tint text-foreground"
                        : "border-border bg-surface text-ink-secondary"
                    }`}
                    style={{ padding: "var(--space-md)", minHeight: 44 }}
                  >
                    <span className="font-display text-lg">{angle.title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {angle.description}
                    </span>
                  </button>
                );
              })}
            </div>
            <label className="mt-3 block">
              <span className="font-mono text-[11px] text-muted-foreground">
                Optional angle override
              </span>
              <input
                type="text"
                value={angleOverride}
                onChange={(e) => setAngleOverride(e.target.value)}
                disabled={busy}
                placeholder="Edit angle wording for this generate"
                className="mt-1 w-full rounded border border-border bg-surface text-foreground focus:border-foreground focus:outline-none"
                style={{ minHeight: 44, padding: "0 var(--space-md)" }}
              />
            </label>
          </section>
        ) : (
          <p className="text-muted-foreground" style={{ margin: 0 }}>
            Generate a research brief with angles before drafting.
          </p>
        )}

        <div>
          <button
            type="button"
            disabled={busy || !hasAngles || !effectiveAngleId}
            onClick={() => void generate()}
            className="cursor-pointer rounded bg-primary px-5 font-mono text-[11px] tracking-wide text-on-primary disabled:cursor-not-allowed disabled:opacity-40"
            style={{ minHeight: 44 }}
          >
            {busy
              ? "Generating…"
              : draft
                ? "Regenerate full draft"
                : "Generate draft"}
          </button>
        </div>

        {draft ? (
          <div className="flex flex-col gap-3">
            {DRAFT_SECTION_KEYS.map((key) => {
              const title = DRAFT_SECTION_TITLES[key];
              const isSources = key === "sources";
              const showPreview = previewKeys[key] === true;
              return (
                <section
                  key={key}
                  className="rounded-lg border border-border bg-surface"
                  style={{
                    padding: "var(--space-md)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-display text-xl text-foreground" style={{ margin: 0 }}>
                      {title}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewKeys((prev) => ({
                            ...prev,
                            [key]: !prev[key],
                          }))
                        }
                        className="cursor-pointer rounded border border-border px-3 font-mono text-[11px] text-ink-secondary"
                        style={{ minHeight: 40 }}
                      >
                        {showPreview ? "Edit" : "Preview MD"}
                      </button>
                      <button
                        type="button"
                        disabled={busy || regenKey !== null}
                        onClick={() => void regenerateSection(key)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded border border-secondary bg-terracotta-tint px-3 font-mono text-[11px] text-secondary disabled:opacity-60"
                        style={{ minHeight: 40 }}
                      >
                        <RefreshCw className="size-3.5" aria-hidden="true" />
                        {regenKey === key
                          ? "Working…"
                          : isSources
                            ? "Refresh citations"
                            : "Regenerate"}
                      </button>
                    </div>
                  </div>
                  {showPreview ? (
                    <div className="mt-3 rounded border border-border-hairline bg-surface-subtle p-4">
                      <MarkdownBody content={sectionDrafts[key] ?? ""} />
                    </div>
                  ) : (
                    <textarea
                      value={sectionDrafts[key] ?? ""}
                      onChange={(e) =>
                        setSectionDrafts((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      onBlur={() =>
                        void saveSection(key, sectionDrafts[key] ?? "")
                      }
                      rows={isSources ? 4 : key === "headline" ? 2 : 5}
                      disabled={busy || regenKey !== null}
                      className="mt-2 w-full rounded border border-border bg-surface font-sans text-[15px] leading-relaxed text-foreground focus:border-foreground focus:outline-none"
                      style={{ padding: "var(--space-md)" }}
                      aria-label={title}
                    />
                  )}
                </section>
              );
            })}
          </div>
        ) : null}

        <div>
          <button
            type="button"
            disabled={
              busy ||
              analyzing ||
              !draft ||
              !draft.workingPlain.trim()
            }
            onClick={() => {
              setError(null);
              setAnalyzing(true);
              void onAnalyzeWriting()
                .catch((err: unknown) => {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Analyze failed",
                  );
                })
                .finally(() => setAnalyzing(false));
            }}
            className="cursor-pointer rounded border border-secondary bg-terracotta-tint px-5 font-mono text-[11px] tracking-wide text-secondary disabled:cursor-not-allowed disabled:opacity-40"
            style={{ minHeight: 44 }}
          >
            {analyzing ? "Analyzing…" : "Analyze writing"}
          </button>
          <p className="font-mono text-[11px] text-muted-foreground" style={{ margin: "8px 0 0" }}>
            Opens Writing assist with inline hover suggestions. Section regenerate is a different tool.
          </p>
        </div>
      </div>

      <aside
        className="w-full shrink-0 rounded-lg border border-border bg-surface-subtle lg:w-64"
        style={{ padding: "var(--space-md)", boxShadow: "var(--shadow-sm)" }}
        aria-label="Draft metrics"
      >
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground" style={{ margin: 0 }}>
          Manuscript
        </h3>
        <p className="mt-2 font-mono text-sm text-foreground" style={{ margin: 0 }}>
          <span className="text-2xl font-display">{workingWords}</span>
          <span className="ml-2 text-muted-foreground">words</span>
        </p>
        <p className="font-mono text-[11px] text-muted-foreground" style={{ margin: "12px 0 0" }}>
          Full writing metrics appear after analyze.
        </p>
      </aside>
    </div>
  );
}
