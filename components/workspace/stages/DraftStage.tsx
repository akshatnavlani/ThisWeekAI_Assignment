"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { BriefDto } from "@/lib/types/brief";
import type { DraftDto, DraftMode, DraftSectionKey } from "@/lib/types/draft";
import {
  DRAFT_SECTION_KEYS,
  DRAFT_SECTION_TITLES,
} from "@/lib/types/draft";
import { EmptyState } from "../EmptyState";

type DraftStageProps = {
  draft: DraftDto | null;
  brief: BriefDto | null;
  selectedAngleId: string | null;
  onSelectedAngleIdChange: (angleId: string) => void;
  onDraftChanged: (draft: DraftDto) => void;
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
}: DraftStageProps) {
  const [mode, setMode] = useState<Extract<DraftMode, "starter_draft" | "outline_only">>(
    draft?.mode === "outline_only" ? "outline_only" : "starter_draft",
  );
  const [angleOverride, setAngleOverride] = useState("");
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
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
          <p className="text-destructive" role="alert" style={{ margin: 0 }}>
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
            className="inline-flex border border-border bg-surface"
            role="group"
            aria-label="Draft mode"
          >
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode("starter_draft")}
              className={
                mode === "starter_draft"
                  ? "border-r border-border bg-muted text-foreground"
                  : "border-r border-border bg-surface text-muted-foreground"
              }
              style={{ minHeight: 44, padding: "0 var(--space-md)" }}
              aria-pressed={mode === "starter_draft"}
            >
              Starter draft
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode("outline_only")}
              className={
                mode === "outline_only"
                  ? "bg-muted text-foreground"
                  : "bg-surface text-muted-foreground"
              }
              style={{ minHeight: 44, padding: "0 var(--space-md)" }}
              aria-pressed={mode === "outline_only"}
            >
              Outline only
            </button>
          </div>

          {label ? (
            <span
              className="border border-border bg-muted text-secondary"
              style={{ padding: "4px 10px", fontSize: "0.8125rem" }}
            >
              {label}
            </span>
          ) : null}
        </div>

        {hasAngles ? (
          <section
            className="border border-border bg-surface"
            style={{ padding: "var(--space-md)", boxShadow: "var(--shadow-sm)" }}
          >
            <h3
              className="text-foreground"
              style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600 }}
            >
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
            <label className="mt-3 block">
              <span
                className="text-muted-foreground"
                style={{ fontSize: "0.8125rem" }}
              >
                Optional angle override
              </span>
              <input
                type="text"
                value={angleOverride}
                onChange={(e) => setAngleOverride(e.target.value)}
                disabled={busy}
                placeholder="Edit angle wording for this generate"
                className="mt-1 w-full border border-border bg-surface text-foreground"
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
            className="cursor-pointer bg-accent text-on-primary disabled:cursor-not-allowed disabled:bg-accent/40"
            style={{ minHeight: 44, padding: "0 var(--space-lg)" }}
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
              return (
                <section
                  key={key}
                  className="border border-border bg-surface"
                  style={{
                    padding: "var(--space-md)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3
                      className="text-foreground"
                      style={{
                        margin: 0,
                        fontSize: "0.9375rem",
                        fontWeight: 600,
                      }}
                    >
                      {title}
                    </h3>
                    <button
                      type="button"
                      disabled={busy || regenKey !== null}
                      onClick={() => void regenerateSection(key)}
                      className="inline-flex items-center gap-1 border border-border bg-surface text-secondary disabled:opacity-60"
                      style={{
                        minHeight: 44,
                        padding: "0 var(--space-md)",
                      }}
                    >
                      <RefreshCw
                        className="size-3.5"
                        aria-hidden="true"
                      />
                      {regenKey === key
                        ? "Working…"
                        : isSources
                          ? "Refresh citations"
                          : "Regenerate section"}
                    </button>
                  </div>
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
                    className="mt-2 w-full border border-border bg-surface text-foreground"
                    style={{ padding: "var(--space-md)" }}
                    aria-label={title}
                  />
                </section>
              );
            })}
          </div>
        ) : null}

        <div>
          <button
            type="button"
            disabled
            className="bg-accent/40 text-on-primary"
            style={{ minHeight: 44, padding: "0 var(--space-lg)" }}
          >
            Analyze writing
          </button>
          <p
            className="text-muted-foreground"
            style={{ margin: "var(--space-sm) 0 0", fontSize: "0.8125rem" }}
          >
            Writing assist unlocks in M6. Section regenerate replaces a whole
            section; suggestions will patch spans.
          </p>
        </div>
      </div>

      <aside
        className="w-full shrink-0 border border-border bg-surface lg:w-64"
        style={{ padding: "var(--space-md)", boxShadow: "var(--shadow-sm)" }}
        aria-label="Draft metrics"
      >
        <h3
          className="text-foreground"
          style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600 }}
        >
          Metrics & suggestions
        </h3>
        <p
          className="text-secondary"
          style={{ margin: "var(--space-sm) 0 0", fontSize: "0.875rem" }}
        >
          Word count: {workingWords}
        </p>
        <p
          className="text-muted-foreground"
          style={{ margin: "var(--space-sm) 0 0", fontSize: "0.8125rem" }}
        >
          Full metrics and writing suggestions appear after analyze (M6).
        </p>
      </aside>
    </div>
  );
}
