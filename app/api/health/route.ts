import { NextResponse } from "next/server";

/** Liveness probe — no DB or Gemini dependency. */
export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
