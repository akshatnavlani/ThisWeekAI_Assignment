/**
 * E2E: tech / politics / stocks articles + overlap probe via local APIs.
 * Usage: node scripts/e2e-three-articles.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const { jsPDF } = require("jspdf");

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
const OUT = path.resolve("artifacts/e2e-2026-11-03");
const DB = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve("data/editorial.db");

const log = [];
function note(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  log.push(line);
}

async function api(method, urlPath, body) {
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
  return { ok: res.ok, status: res.status, json };
}

function clearProjectData() {
  if (!fs.existsSync(DB)) {
    note(`DB missing at ${DB} — will be created on first API call`);
    return;
  }
  const db = new Database(DB);
  db.exec(`
    DELETE FROM writing_suggestions;
    DELETE FROM draft_sections;
    DELETE FROM drafts;
    DELETE FROM evidence_claims;
    DELETE FROM brief_angles;
    DELETE FROM research_briefs;
    DELETE FROM sources;
  `);
  db.close();
  note("Cleared sources/brief/draft/suggestions in SQLite");
}

function writeMd(name, content) {
  const p = path.join(OUT, name);
  fs.writeFileSync(p, content ?? "", "utf8");
  note(`Wrote ${name} (${(content || "").length} chars)`);
  return p;
}

function writePdf(name, plain) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;
  const pageHeight = doc.internal.pageSize.getHeight();
  const lines = doc.splitTextToSize(plain || "(empty)", maxWidth);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  for (const line of lines) {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += 14;
  }
  const p = path.join(OUT, name);
  fs.writeFileSync(p, Buffer.from(doc.output("arraybuffer")));
  note(`Wrote ${name} (${fs.statSync(p).size} bytes)`);
}

function briefToMd(brief) {
  if (!brief) return "";
  const lines = [
    "# Research brief",
    "",
    "## What happened",
    "",
    brief.whatHappened || "",
    "",
    "## Why it matters",
    "",
    brief.whyItMatters || "",
    "",
    "## Angles",
    "",
  ];
  for (const a of brief.angles || []) {
    lines.push(`### ${a.title}`, "", a.description || "", "");
  }
  lines.push("## Facts", "");
  for (const f of brief.facts || []) {
    lines.push(`- ${f.text} [${(f.sourceIds || []).join(", ")}]`);
  }
  lines.push("", "## Analysis", "");
  for (const a of brief.analysis || []) {
    lines.push(`- (${a.kind}) ${a.text} [${(a.sourceIds || []).join(", ")}]`);
  }
  lines.push("", "## Connections", "");
  for (const c of brief.connections || []) {
    lines.push(`- ${c.text} [${(c.sourceIds || []).join(", ")}]`);
  }
  return lines.join("\n");
}

async function addPastes(pastes) {
  const created = [];
  for (const content of pastes) {
    const res = await api("POST", "/api/sources", { content });
    if (!res.ok) {
      note(`FAIL add source ${res.status}: ${JSON.stringify(res.json)}`);
      throw new Error("add source failed");
    }
    created.push(res.json.source);
    note(`Added source ${res.json.source.id} (${content.slice(0, 40)}…)`);
  }
  return created;
}

async function generateBrief() {
  note("Generating research brief…");
  const res = await api("POST", "/api/research/generate");
  if (!res.ok) {
    note(`FAIL brief ${res.status}: ${JSON.stringify(res.json)}`);
    return null;
  }
  const brief = res.json.brief;
  note(
    `Brief OK: ${brief.angles?.length ?? 0} angles, ${brief.facts?.length ?? 0} facts, ${brief.connections?.length ?? 0} connections`,
  );
  return brief;
}

async function generateDraft(mode, angleId) {
  note(`Generating draft mode=${mode} angle=${angleId}`);
  const res = await api("POST", "/api/draft/generate", {
    mode,
    angleId,
  });
  if (!res.ok) {
    note(`FAIL draft ${res.status}: ${JSON.stringify(res.json)}`);
    return null;
  }
  note(`Draft OK: ${res.json.draft.workingPlain?.length ?? 0} chars`);
  return res.json.draft;
}

async function analyzeWriting() {
  note("Analyzing writing…");
  const res = await api("POST", "/api/writing/analyze");
  if (!res.ok) {
    note(`FAIL analyze ${res.status}: ${JSON.stringify(res.json)}`);
    return null;
  }
  const suggestions = res.json.suggestions || [];
  const pending = suggestions.filter((s) => s.status === "pending");
  note(
    `Analyze OK: ${pending.length} pending; metrics words=${res.json.metrics?.wordCount}`,
  );
  const cats = {};
  for (const s of pending) cats[s.category] = (cats[s.category] || 0) + 1;
  note(`Categories: ${JSON.stringify(cats)}`);
  if (pending[0]) {
    const acc = await api(
      "POST",
      `/api/writing/suggestions/${pending[0].id}/accept`,
    );
    note(`Accept first: ${acc.status}`);
  }
  if (pending[1]) {
    const rej = await api(
      "POST",
      `/api/writing/suggestions/${pending[1].id}/reject`,
    );
    note(`Reject second: ${rej.status}`);
  }
  return res.json;
}

async function loadProject() {
  const res = await api("GET", "/api/projects/current");
  if (!res.ok) throw new Error("load project failed");
  return res.json;
}

async function runArticle({
  name,
  field,
  pastes,
  mode,
  exports: exp,
}) {
  note(`======== ${name} (${field}) ========`);
  clearProjectData();
  await addPastes(pastes);

  // Gate check for article 1 only logged; all have >=3
  const brief = await generateBrief();
  if (!brief?.angles?.[0]) {
    note(`BLOCKED: no brief/angles for ${name}`);
    return { ok: false };
  }

  const draft = await generateDraft(mode, brief.angles[0].id);
  if (!draft) {
    note(`BLOCKED: no draft for ${name}`);
    return { ok: false, brief };
  }

  await analyzeWriting();
  const refreshed = await loadProject();
  const plain = refreshed.draft?.workingPlain || draft.workingPlain || "";

  if (exp.md) writeMd(exp.md, plain);
  if (exp.pdf) writePdf(exp.pdf, plain);
  if (exp.brief) writeMd(exp.brief, briefToMd(brief));

  return {
    ok: true,
    brief,
    draftChars: plain.length,
    angles: brief.angles.map((a) => a.title),
    connections: brief.connections?.length ?? 0,
    facts: brief.facts?.length ?? 0,
  };
}

const TECH = [
  `OpenEval Labs released QuietForge 2.0, an open-source evaluation harness that cuts local LLM benchmark runtime by about 40% on a single RTX 4090. The release notes highlight deterministic seeds, a new adapter for GGUF models, and a CLI that streams per-prompt latency. Builders on Hacker News said the biggest win is reproducible CI for eval suites that previously flaked under temperature sampling.`,
  `QuietForge 2.0 docs describe a plugin system for custom metrics. Maintainers claim parity with a popular proprietary eval cloud on MMLU-style tasks while staying offline. A maintainer post clarified that “40% faster” compares against QuietForge 1.4 with identical prompts, not against every commercial suite.`,
  `Several indie AI startups reported swapping their ad-hoc pytest eval scripts for QuietForge 2.0 within a week of launch. One founder noted the GGUF adapter finally let them score quantized models without renting cloud GPUs, though they still want better multi-node scheduling.`,
];

const POLITICS = [
  `The Senate Commerce Committee advanced the Algorithmic Accountability Act amendments requiring large platforms to publish annual risk assessments for recommender systems used by more than 50 million US users. The markup passed on a bipartisan voice vote after negotiators narrowed the definition of “high-risk automated decision systems.”`,
  `Civil liberties groups praised the bill’s audit provisions but warned that trade-secret carve-outs could blunt independent review. A coalition letter urged the House to restore a private right of action that was stripped in committee.`,
  `Industry associations argued the compliance timeline of 18 months is unrealistic for mid-size platforms and asked for a safe harbor when models are provided by third-party vendors. Lobbyists signaled they will push for a national preemption clause against state AI laws.`,
  `Two swing-state senators said they support transparency rules but oppose any provision that would force companies to disclose model weights. Floor debate is expected after the August recess if leadership finds room on the calendar.`,
];

const STOCKS = [
  `Megacap chipmaker NorthPeak Semiconductor reported Q2 revenue of $28.4B, beating consensus by 4%, driven by data-center GPU shipments. Guidance for Q3 implied sequential growth of 8–10%, above the Street’s 6% estimate. Shares jumped 7% in after-hours trading.`,
  `Analysts at Harbor Street raised NorthPeak’s price target to $145 from $120, citing sustained hyperscaler capex. A dissenting note from Vale Research warned that inventory digestion at cloud customers could appear by Q4 if training cluster utilization softens.`,
  `The Philadelphia Semiconductor Index (SOX) rose 3.1% on the NorthPeak print, with peer memory and networking names also green. Options markets showed elevated call volume in near-dated contracts.`,
  `Treasury yields ticked higher as traders pared bets on an early rate cut, but equity risk appetite still favored growth names. ETF flows into SMH were the largest single-day intake in three weeks according to preliminary data.`,
  `Buy-side commentary framed NorthPeak as a proxy for AI infrastructure spend rather than classic PC cyclicality. Several funds said they rotated out of unprofitable software into semiconductor leaders after the beat.`,
];

const OVERLAP = [
  `Tech wire: Aurora Dynamics open-sourced AuroraMind-70B weights and a commercial-friendly license. The lab claims state-of-the-art results on coding benchmarks and says inference fits on 2×80GB GPUs with quantization. Developers flooded GitHub with 12k stars in 36 hours.`,
  `Second tech take: AuroraMind-70B is impressive on HumanEval but several independent reproducers saw weaker scores on long-context retrieval than the lab’s blog claimed. Still, the release undercuts closed-model vendors on price for coding assistants.`,
  `Politics: Members of Congress asked the Commerce Department whether open releases like AuroraMind-70B require new export controls. A draft letter circulating among staffers cites national-security risk if advanced weights are freely mirrored overseas.`,
  `Markets: Cloud and chip stocks rallied on the AuroraMind news as investors argued open weights increase demand for inference hardware. Aurora Dynamics has no public equity, but suppliers and GPU landlords were bid. One hedge fund note called it “bullish metal, mixed for SaaS wrappers.”`,
  `Cross note: Policy risk and hardware demand now pull in opposite directions on the same AuroraMind headline—export-control talk vs GPU pull-through—leaving operators to hedge both regulatory and capacity scenarios.`,
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  note(`E2E start BASE=${BASE} DB=${DB} OUT=${OUT}`);

  const health = await api("GET", "/api/health");
  note(`Health: ${health.status} ${JSON.stringify(health.json)}`);
  if (!health.ok) {
    throw new Error("App not healthy");
  }

  // Document <3 gate once
  clearProjectData();
  await addPastes([TECH[0], TECH[1]]);
  const gate = await api("POST", "/api/research/generate");
  note(
    `Gate with 2 sources: status=${gate.status} code=${gate.json?.error?.code || "n/a"} (expect NEEDS_SOURCES/409)`,
  );

  const r1 = await runArticle({
    name: "Article 1",
    field: "tech",
    pastes: TECH,
    mode: "starter_draft",
    exports: {
      md: "article-1-tech-starter.md",
      pdf: "article-1-tech-starter.pdf",
    },
  });

  const r2 = await runArticle({
    name: "Article 2",
    field: "politics",
    pastes: POLITICS,
    mode: "outline_only",
    exports: { md: "article-2-politics-outline.md" },
  });

  const r3 = await runArticle({
    name: "Article 3",
    field: "stocks",
    pastes: STOCKS,
    mode: "starter_draft",
    exports: {
      md: "article-3-stocks-starter.md",
      pdf: "article-3-stocks-starter.pdf",
      brief: "article-3-stocks-brief.md",
    },
  });

  note("======== Overlap probe ========");
  const ov = await runArticle({
    name: "Overlap probe",
    field: "cross-field",
    pastes: OVERLAP,
    mode: "starter_draft",
    exports: { md: "overlap-probe-starter.md" },
  });

  if (ov.brief) {
    note(
      `Overlap angles: ${JSON.stringify(ov.angles)}; connections=${ov.connections}; facts=${ov.facts}`,
    );
    const hasPolicy = (ov.angles || []).some((t) =>
      /regulat|policy|export|congress|law/i.test(t),
    );
    const hasMarket = (ov.angles || []).some((t) =>
      /market|stock|gpu|hardware|invest/i.test(t),
    );
    const hasTech = (ov.angles || []).some((t) =>
      /model|open.?source|aurora|developer|coding/i.test(t),
    );
    note(
      `Overlap angle coverage tech=${hasTech} policy=${hasPolicy} market=${hasMarket}`,
    );
    writeMd("overlap-probe-brief.md", briefToMd(ov.brief));
  }

  const summary = {
    article1_tech: r1.ok ? "PASS" : "FAIL",
    article2_politics: r2.ok ? "PASS" : "FAIL",
    article3_stocks: r3.ok ? "PASS" : "FAIL",
    overlap_probe: ov.ok ? "PASS" : "FAIL",
  };
  note(`SUMMARY ${JSON.stringify(summary)}`);

  const runlog = [
    "# E2E RUNLOG — tech / politics / stocks + overlap",
    "",
    `Date: ${new Date().toISOString()}`,
    `Base: ${BASE}`,
    "",
    "## Summary",
    "",
    "| Run | Result |",
    "|---|---|",
    `| Article 1 Tech (3 sources, starter) | ${summary.article1_tech} |`,
    `| Article 2 Politics (4 sources, outline) | ${summary.article2_politics} |`,
    `| Article 3 Stocks (5 sources, starter) | ${summary.article3_stocks} |`,
    `| Overlap probe (cross-field) | ${summary.overlap_probe} |`,
    "",
    "## Method",
    "",
    "API-driven against local Next server; SQLite cleared between runs; paste-only sources; exports written by script (MD + jsPDF).",
    "",
    "## Overlap observations",
    "",
    ov.ok
      ? [
          `- Angles: ${(ov.angles || []).join(" | ") || "(none)"}`,
          `- Facts: ${ov.facts}; Connections: ${ov.connections}`,
          "- Near-duplicate tech pastes both ingested (separate source rows).",
          "- See overlap-probe-brief.md for facts/analysis/connections detail.",
        ].join("\n")
      : "- Overlap probe did not complete successfully; see log below.",
    "",
    "## Full log",
    "",
    "```",
    ...log,
    "```",
    "",
  ].join("\n");

  fs.writeFileSync(path.join(OUT, "RUNLOG.md"), runlog, "utf8");
  note("Wrote RUNLOG.md");
}

main().catch((err) => {
  console.error(err);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(
    path.join(OUT, "RUNLOG.md"),
    `# E2E FAILED\n\n${err?.stack || err}\n\n\`\`\`\n${log.join("\n")}\n\`\`\`\n`,
    "utf8",
  );
  process.exit(1);
});
