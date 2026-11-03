import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("Untitled editorial"),
  stage: text("stage").notNull().default("sources"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const sources = sqliteTable(
  "sources",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    url: text("url"),
    title: text("title"),
    content: text("content").notNull().default(""),
    modality: text("modality").notNull(),
    status: text("status").notNull(),
    errorMessage: text("error_message"),
    imageUrl: text("image_url"),
    rawMetaJson: text("raw_meta_json"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("sources_project_id_idx").on(table.projectId),
    uniqueIndex("sources_project_url_unique")
      .on(table.projectId, table.url)
      .where(sql`${table.url} IS NOT NULL`),
  ],
);

export const researchBriefs = sqliteTable("research_briefs", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  whatHappened: text("what_happened").notNull().default(""),
  whyItMatters: text("why_it_matters").notNull().default(""),
  factsJson: text("facts_json").notNull().default("[]"),
  analysisJson: text("analysis_json").notNull().default("[]"),
  connectionsJson: text("connections_json").notNull().default("[]"),
  rawModelJson: text("raw_model_json"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const briefAngles = sqliteTable("brief_angles", {
  id: text("id").primaryKey(),
  briefId: text("brief_id")
    .notNull()
    .references(() => researchBriefs.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const evidenceClaims = sqliteTable("evidence_claims", {
  id: text("id").primaryKey(),
  briefId: text("brief_id")
    .notNull()
    .references(() => researchBriefs.id, { onDelete: "cascade" }),
  claimText: text("claim_text").notNull(),
  claimType: text("claim_type").notNull(),
  sourceIdsJson: text("source_ids_json").notNull().default("[]"),
});

export const drafts = sqliteTable("drafts", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  mode: text("mode").notNull(),
  selectedAngleId: text("selected_angle_id"),
  originalSnapshot: text("original_snapshot"),
  workingPlain: text("working_plain").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const draftSections = sqliteTable(
  "draft_sections",
  {
    id: text("id").primaryKey(),
    draftId: text("draft_id")
      .notNull()
      .references(() => drafts.id, { onDelete: "cascade" }),
    sectionKey: text("section_key").notNull(),
    title: text("title").notNull(),
    purpose: text("purpose").notNull().default(""),
    content: text("content").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("draft_sections_draft_key_unique").on(
      table.draftId,
      table.sectionKey,
    ),
  ],
);

export const writingSuggestions = sqliteTable(
  "writing_suggestions",
  {
    id: text("id").primaryKey(),
    draftId: text("draft_id")
      .notNull()
      .references(() => drafts.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    passage: text("passage").notNull(),
    startOffset: integer("start_offset").notNull(),
    endOffset: integer("end_offset").notNull(),
    explanation: text("explanation").notNull().default(""),
    rewrite: text("rewrite").notNull().default(""),
    status: text("status").notNull().default("pending"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("writing_suggestions_draft_status_idx").on(
      table.draftId,
      table.status,
    ),
  ],
);
