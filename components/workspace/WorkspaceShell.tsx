"use client";

import { useCallback, useEffect, useState } from "react";
import type { BriefDto } from "@/lib/types/brief";
import type { SourceDto } from "@/lib/types/source";
import {
  isProjectStage,
  type ProjectStage,
} from "@/lib/workspace/stages";
import { LoadingBlock } from "./LoadingBlock";
import { StageStepper } from "./StageStepper";
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

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      project: ProjectDto;
      sources: SourceDto[];
      brief: BriefDto | null;
    };

type StagePanelProps = {
  stage: ProjectStage;
  sources: SourceDto[];
  brief: BriefDto | null;
  onSourcesChanged: () => Promise<void>;
  onGenerateBrief: () => Promise<void>;
  onContinueToDraft: () => void;
};

function StagePanel({
  stage,
  sources,
  brief,
  onSourcesChanged,
  onGenerateBrief,
  onContinueToDraft,
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
          onChanged={onSourcesChanged}
          onContinueToDraft={onContinueToDraft}
        />
      );
    case "draft":
      return <DraftStage />;
    case "writing":
      return <WritingStage />;
  }
}

export function WorkspaceShell() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [stage, setStage] = useState<ProjectStage>("sources");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPayload = useCallback(async () => {
    const res = await fetch("/api/projects/current");
    if (!res.ok) {
      throw new Error(`Load failed (${res.status})`);
    }
    return (await res.json()) as {
      project: ProjectDto;
      sources: SourceDto[];
      brief: BriefDto | null;
    };
  }, []);

  const applyPayload = useCallback(
    (data: {
      project: ProjectDto;
      sources: SourceDto[];
      brief: BriefDto | null;
    }) => {
      setLoadState({
        status: "ready",
        project: data.project,
        sources: data.sources ?? [],
        brief: data.brief ?? null,
      });
    },
    [],
  );

  const loadProject = useCallback(async () => {
    setLoadState({ status: "loading" });
    setActionError(null);
    try {
      const data = await fetchPayload();
      const nextStage = isProjectStage(data.project.stage)
        ? data.project.stage
        : "sources";
      setStage(nextStage);
      applyPayload(data);
    } catch {
      setLoadState({
        status: "error",
        message: "Couldn't load project — retry",
      });
    }
  }, [applyPayload, fetchPayload]);

  const refreshProject = useCallback(async () => {
    try {
      const data = await fetchPayload();
      applyPayload(data);
    } catch {
      setActionError("Couldn't refresh project — retry from the header.");
    }
  }, [applyPayload, fetchPayload]);

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

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header
        className="border-b border-border bg-surface"
        style={{ padding: "var(--space-md) var(--space-xl)" }}
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p
              className="font-display text-primary"
              style={{ fontSize: "1.5rem", lineHeight: 1.2, margin: 0 }}
            >
              This Week in AI
            </p>
            <p
              className="text-muted-foreground"
              style={{ margin: "var(--space-xs) 0 0", fontSize: "0.875rem" }}
            >
              Editorial Workspace
              {loadState.status === "ready" ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="text-secondary">{loadState.project.title}</span>
                </>
              ) : null}
            </p>
          </div>
          {loadState.status === "ready" ? (
            <StageStepper
              active={stage}
              disabled={isSaving}
              onSelect={(s) => {
                void selectStage(s);
              }}
            />
          ) : null}
        </div>
        {actionError ? (
          <p
            className="mx-auto w-full max-w-6xl text-destructive"
            style={{ margin: "var(--space-sm) auto 0", fontSize: "0.875rem" }}
            role="alert"
          >
            {actionError}
          </p>
        ) : null}
      </header>

      <main
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col"
        style={{ padding: "var(--space-xl)" }}
      >
        {loadState.status === "loading" ? (
          <LoadingBlock />
        ) : loadState.status === "error" ? (
          <div
            className="border border-border bg-surface"
            style={{ padding: "var(--space-xl)", boxShadow: "var(--shadow-sm)" }}
          >
            <p className="text-destructive" role="alert" style={{ margin: 0 }}>
              {loadState.message}
            </p>
            <button
              type="button"
              onClick={() => void loadProject()}
              className="mt-4 cursor-pointer bg-primary text-on-primary"
              style={{ minHeight: 44, padding: "0 var(--space-lg)" }}
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
              onSourcesChanged={refreshProject}
              onGenerateBrief={generateBrief}
              onContinueToDraft={() => {
                void selectStage("draft");
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
