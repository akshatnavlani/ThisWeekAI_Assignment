CREATE TABLE `brief_angles` (
	`id` text PRIMARY KEY NOT NULL,
	`brief_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`brief_id`) REFERENCES `research_briefs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `draft_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`draft_id` text NOT NULL,
	`section_key` text NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`draft_id`) REFERENCES `drafts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `draft_sections_draft_key_unique` ON `draft_sections` (`draft_id`,`section_key`);--> statement-breakpoint
CREATE TABLE `drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`mode` text NOT NULL,
	`selected_angle_id` text,
	`original_snapshot` text,
	`working_plain` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `evidence_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`brief_id` text NOT NULL,
	`claim_text` text NOT NULL,
	`claim_type` text NOT NULL,
	`source_ids_json` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`brief_id`) REFERENCES `research_briefs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text DEFAULT 'Untitled editorial' NOT NULL,
	`stage` text DEFAULT 'sources' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_briefs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`what_happened` text DEFAULT '' NOT NULL,
	`why_it_matters` text DEFAULT '' NOT NULL,
	`facts_json` text DEFAULT '[]' NOT NULL,
	`analysis_json` text DEFAULT '[]' NOT NULL,
	`connections_json` text DEFAULT '[]' NOT NULL,
	`raw_model_json` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`kind` text NOT NULL,
	`url` text,
	`title` text,
	`content` text DEFAULT '' NOT NULL,
	`modality` text NOT NULL,
	`status` text NOT NULL,
	`error_message` text,
	`raw_meta_json` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sources_project_id_idx` ON `sources` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `sources_project_url_unique` ON `sources` (`project_id`,`url`) WHERE "sources"."url" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `writing_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`draft_id` text NOT NULL,
	`category` text NOT NULL,
	`passage` text NOT NULL,
	`start_offset` integer NOT NULL,
	`end_offset` integer NOT NULL,
	`explanation` text DEFAULT '' NOT NULL,
	`rewrite` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`draft_id`) REFERENCES `drafts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `writing_suggestions_draft_status_idx` ON `writing_suggestions` (`draft_id`,`status`);