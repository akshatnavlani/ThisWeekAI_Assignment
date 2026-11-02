"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownBodyProps = {
  content: string;
  className?: string;
};

/** Display-only markdown. Do not use inside offset-based highlight canvases. */
export function MarkdownBody({ content, className = "" }: MarkdownBodyProps) {
  const trimmed = content.trim();
  if (!trimmed) {
    return null;
  }
  return (
    <div className={`atelier-prose ${className}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{trimmed}</ReactMarkdown>
    </div>
  );
}
