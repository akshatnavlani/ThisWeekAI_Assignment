/**
 * One-off M7 live capture against local Next.js (not a product feature).
 * Usage: node scripts/m7-e2e-capture.mjs
 */
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.M7_BASE_URL || "http://127.0.0.1:3000";
const OUT = path.join("data", "m7-capture.json");

const SOURCES = [
  {
    title: "OpenAI — Introducing GPT-4o mini",
    url: "https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/",
    content: `OpenAI announced GPT-4o mini as a smaller, lower-cost model in the GPT-4o family aimed at high-volume workloads. The company positions the model for chat, coding helpers, and classification tasks where latency and price matter more than peak capability. GPT-4o mini is described as significantly cheaper than frontier models while retaining multimodal-oriented lineage from GPT-4o. For founders and operators, the release continues a pattern: flagship models set the ceiling while mini and flash variants set the unit economics for products that call models millions of times per day. OpenAI highlights that developers can migrate many GPT-3.5-class and mid-tier workloads to GPT-4o mini for better quality at constrained budgets. The announcement also stresses API availability and that pricing is designed for cost-efficient intelligence at scale.`,
  },
  {
    title: "Google — Gemini 1.5 Flash",
    url: "https://developers.googleblog.com/en/gemini-15-flash-8b-is-now-generally-available-for-use/",
    content: `Google positioned Gemini Flash-class models as the high-throughput option in the Gemini family for developers who need long context and fast responses without paying frontier rates. Flash models target summarization, data extraction, and interactive applications where round-trip time dominates user experience. Google's developer messaging emphasizes that Flash is the practical default for many production paths, with Pro or Ultra reserved for harder reasoning. For builders shipping agentic or editorial tools, Flash-class models reduce the cost of structured JSON generation and multi-step pipelines. The availability of smaller Flash variants further pushes the industry toward cascading: route easy tasks to Flash, escalate only when quality gates fail. Operators care about predictable latency and quotas on free and paid tiers when running continuous editorial or support workloads.`,
  },
  {
    title: "Anthropic — Claude 3.5 Sonnet",
    url: "https://www.anthropic.com/news/claude-3-5-sonnet",
    content: `Anthropic released Claude 3.5 Sonnet as a mid-to-high capability model emphasizing coding, tool use, and nuanced writing. The company frames Sonnet as balancing intelligence and speed for everyday professional work, not only benchmark chasing. Enterprise buyers evaluate Sonnet against GPT and Gemini for drafting, analysis, and agent workflows that must preserve technical nuance. Anthropic's safety and constitutional AI narrative remains part of the go-to-market story, which matters for regulated teams. For newsletter editors and product writers, Sonnet-class models are often used where tone control and instruction following matter as much as raw knowledge. The competitive pressure among OpenAI, Google, and Anthropic is compressing price-performance curves: each lab ships a workhorse model that is "good enough" for most product surfaces while reserving ultra models for hard problems.`,
  },
];

async function req(method, urlPath, body) {
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const msg = json?.error?.message || text.slice(0, 400);
    const err = new Error(`${method} ${urlPath} -> ${res.status}: ${msg}`);
    err.status = res.status;
    err.code = json?.error?.code;
    throw err;
  }
  return json;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetries(label, fn, attempts = 5) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const wait = 10000 * (i + 1);
      console.log(`[retry ${label}] attempt ${i + 1}/${attempts}: ${err.message}; sleep ${wait}ms`);
      await sleep(wait);
    }
  }
  throw last;
}

async function main() {
  const log = [];
  const push = (step, detail) => {
    console.log(`[${step}]`, typeof detail === "string" ? detail : JSON.stringify(detail));
    log.push({ step, detail, at: new Date().toISOString() });
  };

  push("health", "GET /api/projects/current");
  let current = await req("GET", "/api/projects/current");

  let sourceIds = (current.sources || []).map((s) => ({
    id: s.id,
    title: s.title,
    url: s.url,
    status: s.status,
  }));
  const readyCount = sourceIds.filter((s) => s.status === "ready").length;
  if (readyCount < 3) {
    sourceIds = [];
    for (const s of SOURCES) {
      push("source", s.title);
      try {
        const { source } = await req("POST", "/api/sources", {
          title: s.title,
          url: s.url,
          content: s.content,
          kind: "article",
        });
        sourceIds.push({
          id: source.id,
          title: source.title,
          url: source.url,
          status: source.status,
        });
      } catch (err) {
        if (String(err.message).includes("409")) {
          push("source_dup", s.title);
        } else {
          throw err;
        }
      }
    }
    current = await req("GET", "/api/projects/current");
    sourceIds = (current.sources || []).map((s) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      status: s.status,
    }));
  }
  push("sources_ready", sourceIds);

  let brief = current.brief;
  if (!brief?.angles?.length) {
    push("brief", "POST /api/research/generate");
    const briefRes = await withRetries("brief", () =>
      req("POST", "/api/research/generate"),
    );
    brief = briefRes.brief;
  } else {
    push("brief", "reusing existing brief");
  }
  if (!brief?.angles?.length) throw new Error("No angles in brief");
  const angleId = brief.angles[0].id;
  push("angle", { angleId, title: brief.angles[0].title });

  let draft = current.draft;
  if (!draft?.workingPlain?.trim()) {
    push("draft", "POST /api/draft/generate starter_draft");
    const draftRes = await withRetries("draft", () =>
      req("POST", "/api/draft/generate", {
        mode: "starter_draft",
        angleId,
      }),
    );
    draft = draftRes.draft;
  } else {
    push("draft", "reusing existing draft");
  }
  push("draft_words", draft.workingPlain.trim().split(/\s+/).length);

  // Optional one section regen
  try {
    push("section_regen", "implication");
    const regen = await withRetries("section_regen", () =>
      req("POST", "/api/draft/sections/implication/regenerate"),
      3,
    );
    draft = regen.draft;
  } catch (err) {
    push("section_regen_skip", String(err));
  }

  const originalBeforeAnalyze = draft.originalSnapshot || draft.workingPlain;

  push("analyze", "POST /api/writing/analyze");
  const analyze = await withRetries("analyze", () =>
    req("POST", "/api/writing/analyze"),
  );
  draft = analyze.draft;
  let suggestions = analyze.suggestions || [];
  const metrics = analyze.metrics;
  push("suggestions_pending", suggestions.filter((s) => s.status === "pending").length);

  const pending = suggestions.filter((s) => s.status === "pending");
  const feedbackLog = [];

  const toAccept = pending.slice(0, 2);
  const toReject = pending.slice(2, 3);

  for (const s of toAccept) {
    push("accept", s.id);
    const result = await req("POST", `/api/writing/suggestions/${s.id}/accept`);
    draft = result.draft;
    suggestions = result.suggestions;
    feedbackLog.push({
      id: s.id,
      category: s.category,
      passage: s.passage,
      explanation: s.explanation,
      rewrite: s.rewrite,
      decision: "accepted",
    });
  }

  for (const s of toReject) {
    push("reject", s.id);
    const result = await req("POST", `/api/writing/suggestions/${s.id}/reject`);
    suggestions = result.suggestions;
    feedbackLog.push({
      id: s.id,
      category: s.category,
      passage: s.passage,
      explanation: s.explanation,
      rewrite: s.rewrite,
      decision: "rejected",
    });
  }

  // If fewer than 2 accepts possible, note it
  if (toAccept.length < 2) {
    push("warn", `Only ${toAccept.length} accepts (wanted ≥2)`);
  }
  if (toReject.length < 1) {
    push("warn", "No pending left to reject");
  }

  const final = await req("GET", "/api/projects/current");
  const capture = {
    capturedAt: new Date().toISOString(),
    sources: SOURCES.map((s) => ({ title: s.title, url: s.url })),
    sourceIds,
    brief: {
      whatHappened: brief.whatHappened,
      whyItMatters: brief.whyItMatters,
      angles: brief.angles,
    },
    angleId,
    originalSnapshot: final.draft?.originalSnapshot || originalBeforeAnalyze,
    workingPlain: final.draft?.workingPlain,
    sections: final.draft?.sections,
    suggestions: final.suggestions,
    feedbackLog,
    metrics: metrics || null,
    log,
  };

  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(capture, null, 2), "utf8");
  push("wrote", OUT);
  console.log("WORD_COUNT", (capture.workingPlain || "").trim().split(/\s+/).filter(Boolean).length);
}

main().catch((err) => {
  console.error("M7_CAPTURE_FAILED", err);
  process.exit(1);
});
