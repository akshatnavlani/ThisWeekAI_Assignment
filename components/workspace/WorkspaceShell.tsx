"use client";

import { useCallback, useEffect, useState } from "react";
import type { BriefDto } from "@/lib/types/brief";
import type { DraftDto } from "@/lib/types/draft";
import type { SourceDto } from "@/lib/types/source";
import type { SuggestionDto, WritingMetrics } from "@/lib/types/writing";
import {
  isProjectStage,
  type ProjectStage,
} from "@/lib/workspace/stages";
import { LoadingBlock } from "./LoadingBlock";
import { StageStepper } from "./StageStepper";
import { ThemeToggle } from "./ThemeToggle";
import { DraftStage } from "./stages/DraftStage";
import { ResearchStage } from "./stages/ResearchStage";
import { SourcesStage } from "./stages/SourcesStage";
import { WritingStage } from "./stages/WritingStage";

type ProjectDto = {
  id: string;
  title: string;
  stage: string;
  createdAt: string;
  updatedAt: string;
};

type ProjectPayload = {
  project: ProjectDto;
  sources: SourceDto[];
  brief: BriefDto | null;
  draft: DraftDto | null;
  suggestions?: SuggestionDto[];
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      project: ProjectDto;
      sources: SourceDto[];
      brief: BriefDto | null;
      draft: DraftDto | null;
      suggestions: SuggestionDto[];
      metrics: WritingMetrics | null;
    };

type StagePanelProps = {
  stage: ProjectStage;
  sources: SourceDto[];
  brief: BriefDto | null;
  draft: DraftDto | null;
  suggestions: SuggestionDto[];
  metrics: WritingMetrics | null;
  writingBusy: boolean;
  selectedAngleId: string | null;
  onSelectedAngleIdChange: (angleId: string) => void;
  onSourcesChanged: () => Promise<void>;
  onGenerateBrief: () => Promise<void>;
  onContinueToDraft: () => void;
  onDraftChanged: (draft: DraftDto) => void;
  onAnalyzeWriting: () => Promise<void>;
  onAcceptSuggestion: (id: string) => Promise<void>;
  onRejectSuggestion: (id: string) => Promise<void>;
};

function StagePanel({
  stage,
  sources,
  brief,
  draft,
  suggestions,
  metrics,
  writingBusy,
  selectedAngleId,
  onSelectedAngleIdChange,
  onSourcesChanged,
  onGenerateBrief,
  onContinueToDraft,
  onDraftChanged,
  onAnalyzeWriting,
  onAcceptSuggestion,
  onRejectSuggestion,
}: StagePanelProps) {
  switch (stage) {
    case "sources":
      return (
        <SourcesStage
          sources={sources}
          onChanged={onSourcesChanged}
          onGenerateBrief={onGenerateBrief}
        />
      );
    case "research":
      return (
        <ResearchStage
          brief={brief}
          sources={sources}
          selectedAngleId={selectedAngleId}
          onSelectedAngleIdChange={onSelectedAngleIdChange}
          onChanged={onSourcesChanged}
          onContinueToDraft={onContinueToDraft}
        />
      );
    case "draft":
      return (
        <DraftStage
          draft={draft}
          brief={brief}
          selectedAngleId={selectedAngleId}
          onSelectedAngleIdChange={onSelectedAngleIdChange}
          onDraftChanged={onDraftChanged}
          onAnalyzeWriting={onAnalyzeWriting}
        />
      );
    case "writing":
      return (
        <WritingStage
          draft={draft}
          suggestions={suggestions}
          metrics={metrics}
          busy={writingBusy}
          onAnalyze={onAnalyzeWriting}
          onAccept={onAcceptSuggestion}
          onReject={onRejectSuggestion}
        />
      );
  }
}

export function WorkspaceShell() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [stage, setStage] = useState<ProjectStage>("sources");
  const [selectedAngleId, setSelectedAngleId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [writingBusy, setWritingBusy] = useState(false);

  const fetchPayload = useCallback(async () => {
    const res = await fetch("/api/projects/current");
    if (!res.ok) {
      throw new Error(`Load failed (${res.status})`);
    }
    return (await res.json()) as ProjectPayload;
  }, []);

  const loadProject = useCallback(async () => {
    setLoadState({ status: "loading" });
    setActionError(null);
    try {
      const data = await fetchPayload();
      const nextStage = isProjectStage(data.project.stage)
        ? data.project.stage
        : "sources";
      setStage(nextStage);
      setLoadState({
        status: "ready",
        project: data.project,
        sources: data.sources ?? [],
        brief: data.brief ?? null,
        draft: data.draft ?? null,
        suggestions: data.suggestions ?? [],
        metrics: null,
      });
      if (data.draft?.selectedAngleId) {
        setSelectedAngleId(data.draft.selectedAngleId);
      } else if (data.brief?.angles[0]) {
        setSelectedAngleId(data.brief.angles[0].id);
      }
    } catch {
      setLoadState({
        status: "error",
        message: "Couldn't load project — retry",
      });
    }
  }, [fetchPayload]);

  const refreshProject = useCallback(async () => {
    try {
      const data = await fetchPayload();
      setLoadState((prev) => {
        const suggestions = data.suggestions ?? [];
        if (prev.status === "ready") {
          return {
            ...prev,
            project: data.project,
            sources: data.sources ?? [],
            brief: data.brief ?? null,
            draft: data.draft ?? null,
            suggestions,
          };
        }
        return {
          status: "ready",
          project: data.project,
          sources: data.sources ?? [],
          brief: data.brief ?? null,
          draft: data.draft ?? null,
          suggestions,
          metrics: null,
        };
      });
      if (data.draft?.selectedAngleId) {
        setSelectedAngleId(data.draft.selectedAngleId);
      }
    } catch {
      setActionError("Couldn't refresh project — retry from the header.");
    }
  }, [fetchPayload]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  const selectStage = async (next: ProjectStage) => {
    if (loadState.status !== "ready" || next === stage || isSaving) {
      return;
    }
    const previous = stage;
    setActionError(null);
    setStage(next);
    setIsSaving(true);

    try {
      const res = await fetch("/api/projects/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: next }),
      });
      if (!res.ok) {
        throw new Error(`Save failed (${res.status})`);
      }
      const data = (await res.json()) as { project: ProjectDto };
      setLoadState((prev) =>
        prev.status === "ready"
          ? { ...prev, project: data.project }
          : prev,
      );
    } catch {
      setStage(previous);
      setActionError("Couldn't save stage — reverted. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const generateBrief = async () => {
    const res = await fetch("/api/research/generate", { method: "POST" });
    const data = (await res.json()) as {
      error?: { message?: string };
      brief?: BriefDto;
    };
    if (!res.ok) {
      throw new Error(data.error?.message ?? `Generate failed (${res.status})`);
    }
    await refreshProject();
    await selectStage("research");
  };

  const onDraftChanged = (draft: DraftDto) => {
    setLoadState((prev) =>
      prev.status === "ready"
        ? { ...prev, draft, suggestions: [] }
        : prev,
    );
    if (draft.selectedAngleId) {
      setSelectedAngleId(draft.selectedAngleId);
    }
  };

  const analyzeWriting = async () => {
    setWritingBusy(true);
    setActionError(null);
    try {
      const res = await fetch("/api/writing/analyze", { method: "POST" });
      const data = (await res.json()) as {
        error?: { message?: string };
        draft?: DraftDto;
        suggestions?: SuggestionDto[];
        metrics?: WritingMetrics;
      };
      if (!res.ok) {
        throw new Error(data.error?.message ?? `Analyze failed (${res.status})`);
      }
      setLoadState((prev) =>
        prev.status === "ready"
          ? {
              ...prev,
              draft: data.draft ?? prev.draft,
              suggestions: data.suggestions ?? [],
              metrics: data.metrics ?? null,
            }
          : prev,
      );
      setStage("writing");
    } finally {
      setWritingBusy(false);
    }
  };

  const acceptSuggestion = async (id: string) => {
    const res = await fetch(`/api/writing/suggestions/${id}/accept`, {
      method: "POST",
    });
    const data = (await res.json()) as {
      error?: { message?: string };
      draft?: DraftDto;
      suggestions?: SuggestionDto[];
      metrics?: WritingMetrics;
    };
    if (!res.ok) {
      throw new Error(data.error?.message ?? `Accept failed (${res.status})`);
    }
    setLoadState((prev) =>
      prev.status === "ready"
        ? {
            ...prev,
            draft: data.draft ?? prev.draft,
            suggestions: data.suggestions ?? prev.suggestions,
            metrics: data.metrics ?? prev.metrics,
          }
        : prev,
    );
  };

  const rejectSuggestion = async (id: string) => {
    const res = await fetch(`/api/writing/suggestions/${id}/reject`, {
      method: "POST",
    });
    const data = (await res.json()) as {
      error?: { message?: string };
      suggestions?: SuggestionDto[];
    };
    if (!res.ok) {
      throw new Error(data.error?.message ?? `Reject failed (${res.status})`);
    }
    setLoadState((prev) =>
      prev.status === "ready"
        ? { ...prev, suggestions: data.suggestions ?? prev.suggestions }
        : prev,
    );
  };

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="size-2.5 shrink-0 rounded-full bg-secondary"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <p className="font-display text-xl tracking-tight text-foreground sm:text-2xl" style={{ margin: 0 }}>
                  This Week in AI
                </p>
                <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
                  Studio
                </span>
              </div>
              {loadState.status === "ready" ? (
                <p
                  className="truncate font-mono text-[11px] tracking-wide text-ink-secondary"
                  style={{ margin: "4px 0 0" }}
                >
                  {loadState.project.title}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            {loadState.status === "ready" ? (
              <StageStepper
                active={stage}
                disabled={isSaving}
                onSelect={(s) => {
                  void selectStage(s);
                }}
              />
            ) : null}
            <ThemeToggle />
          </div>
        </div>
        {actionError ? (
          <p
            className="mx-auto w-full max-w-[1440px] px-4 pb-3 font-mono text-sm text-destructive sm:px-6 lg:px-8"
            style={{ margin: 0 }}
            role="alert"
          >
            {actionError}
          </p>
        ) : null}
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {loadState.status === "loading" ? (
          <LoadingBlock />
        ) : loadState.status === "error" ? (
          <div
            className="rounded-lg border border-border bg-surface"
            style={{ padding: "var(--space-xl)", boxShadow: "var(--shadow-sm)" }}
          >
            <p className="text-destructive" role="alert" style={{ margin: 0 }}>
              {loadState.message}
            </p>
            <button
              type="button"
              onClick={() => void loadProject()}
              className="mt-4 cursor-pointer rounded bg-primary px-4 font-mono text-[11px] tracking-wide text-on-primary"
              style={{ minHeight: 44 }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div key={stage} className="stage-fade">
            <StagePanel
              stage={stage}
              sources={loadState.sources}
              brief={loadState.brief}
              draft={loadState.draft}
              suggestions={loadState.suggestions}
              metrics={loadState.metrics}
              writingBusy={writingBusy}
              selectedAngleId={selectedAngleId}
              onSelectedAngleIdChange={setSelectedAngleId}
              onSourcesChanged={refreshProject}
              onGenerateBrief={generateBrief}
              onContinueToDraft={() => {
                void selectStage("draft");
              }}
              onDraftChanged={onDraftChanged}
              onAnalyzeWriting={analyzeWriting}
              onAcceptSuggestion={acceptSuggestion}
              onRejectSuggestion={rejectSuggestion}
            />
          </div>
        )}
      </main>
    </div>
  );
}
