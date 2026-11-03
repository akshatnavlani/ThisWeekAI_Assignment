-- ADR-019: Compose stage + freeform sections
ALTER TABLE draft_sections ADD COLUMN purpose text NOT NULL DEFAULT '';
--> statement-breakpoint
UPDATE projects SET stage = 'compose' WHERE stage IN ('draft', 'writing');
--> statement-breakpoint
UPDATE drafts SET mode = 'blank' WHERE mode IN ('outline_only', 'manual');
