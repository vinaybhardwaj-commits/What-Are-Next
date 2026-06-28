ALTER TABLE "initiatives" ADD COLUMN "goal_ids" uuid[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
UPDATE "initiatives" SET "goal_ids" = ARRAY["goal_id"] WHERE "goal_id" IS NOT NULL AND ("goal_ids" IS NULL OR "goal_ids" = '{}');
