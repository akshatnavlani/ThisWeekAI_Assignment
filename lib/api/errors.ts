import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_BODY"
  | "INVALID_ANGLE"
  | "INVALID_SECTION"
  | "NOT_FOUND"
  | "NEEDS_SOURCES"
  | "NEEDS_CONTENT"
  | "NEEDS_BRIEF"
  | "NEEDS_DRAFT"
  | "LLM_RATE_LIMIT"
  | "LLM_OUTPUT_INVALID"
  | "LLM_SETUP"
  | "FETCH_FAILED"
  | "DUPLICATE_URL"
  | "SOURCE_CITED"
  | "INTERNAL_ERROR";

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details: Record<string, unknown> = {},
) {
  return NextResponse.json(
    { error: { code, message, details } },
    { status },
  );
}
