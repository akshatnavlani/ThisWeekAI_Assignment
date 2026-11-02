"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { SuggestionDto } from "@/lib/types/writing";
import {
  CATEGORY_HIGHLIGHT_BG,
  CATEGORY_HIGHLIGHT_FG,
} from "@/lib/types/writing";

type SuggestionMarkProps = {
  suggestion: SuggestionDto;
  text: string;
  busy: boolean;
  actingId: string | null;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
};

export function SuggestionMark({
  suggestion,
  text,
  busy,
  actingId,
  onAccept,
  onReject,
}: SuggestionMarkProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();
  const acting = actingId === suggestion.id;

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (wrapRef.current && target && !wrapRef.current.contains(target)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className="relative inline">
      <mark
        tabIndex={0}
        role="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${suggestion.category} suggestion`}
        className="cursor-pointer rounded-sm outline-offset-2"
        style={{
          backgroundColor: CATEGORY_HIGHLIGHT_BG[suggestion.category],
          color: "inherit",
          boxShadow: `inset 0 -2px 0 ${CATEGORY_HIGHLIGHT_FG[suggestion.category]}`,
          padding: "0 1px",
        }}
        onMouseEnter={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        {text}
      </mark>
      {open ? (
        <span
          id={panelId}
          role="dialog"
          aria-label="Writing suggestion"
          className="absolute top-full left-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface p-3 shadow-sm"
          onMouseLeave={() => setOpen(false)}
        >
          <p
            className="font-mono text-[10px] uppercase tracking-wider"
            style={{
              margin: 0,
              color: CATEGORY_HIGHLIGHT_FG[suggestion.category],
            }}
          >
            {suggestion.category}
          </p>
          <p
            className="mt-2 text-sm leading-relaxed text-ink-secondary"
            style={{ margin: "8px 0 0" }}
          >
            {suggestion.explanation}
          </p>
          {suggestion.rewrite && suggestion.rewrite !== suggestion.passage ? (
            <p
              className="mt-2 rounded border border-border-hairline bg-surface-subtle p-2 text-sm text-foreground"
              style={{ margin: "8px 0 0" }}
            >
              <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                Rewrite
              </span>
              <span className="mt-1 block">{suggestion.rewrite}</span>
            </p>
          ) : null}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy || actingId !== null}
              onClick={() => {
                void onAccept(suggestion.id).finally(() => setOpen(false));
              }}
              className="cursor-pointer rounded bg-primary px-3 font-mono text-[11px] text-on-primary disabled:opacity-60"
              style={{ minHeight: 36 }}
            >
              {acting ? "Working…" : "Accept"}
            </button>
            <button
              type="button"
              disabled={busy || actingId !== null}
              onClick={() => {
                void onReject(suggestion.id).finally(() => setOpen(false));
              }}
              className="cursor-pointer rounded border border-border bg-surface px-3 font-mono text-[11px] text-ink-secondary disabled:opacity-60"
              style={{ minHeight: 36 }}
            >
              Reject
            </button>
          </div>
        </span>
      ) : null}
    </span>
  );
}
