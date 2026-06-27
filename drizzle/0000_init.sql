CREATE TYPE "public"."ai_role" AS ENUM('user', 'assistant', 'system', 'tool');--> statement-breakpoint
CREATE TYPE "public"."dep_state" AS ENUM('active', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."energy" AS ENUM('low', 'med', 'high');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('not_started', 'active', 'at_risk', 'done', 'dropped');--> statement-breakpoint
CREATE TYPE "public"."gtd_status" AS ENUM('inbox', 'next', 'waiting', 'scheduled', 'someday', 'done', 'dropped');--> statement-breakpoint
CREATE TYPE "public"."link_type" AS ENUM('linear', 'notion', 'drive', 'prd', 'github', 'vercel', 'other');--> statement-breakpoint
CREATE TYPE "public"."node_type" AS ENUM('objective', 'goal', 'domain', 'initiative', 'action', 'task');--> statement-breakpoint
CREATE TYPE "public"."step_status" AS ENUM('pending', 'in_progress', 'done', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."tag_kind" AS ENUM('context', 'label');--> statement-breakpoint
CREATE TABLE "actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"initiative_id" uuid NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"gtd_status" "gtd_status" DEFAULT 'next' NOT NULL,
	"sequence" integer,
	"sort_order" double precision DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_type" "node_type" NOT NULL,
	"node_id" uuid NOT NULL,
	"event" text NOT NULL,
	"note" text,
	"actor" text DEFAULT 'V' NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"role" "ai_role" NOT NULL,
	"content" text NOT NULL,
	"tool_calls" jsonb,
	"citations" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artefacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_type" "node_type" NOT NULL,
	"node_id" uuid NOT NULL,
	"label" text,
	"blob_url" text NOT NULL,
	"content_type" text,
	"size_bytes" integer,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dependent_node_type" "node_type" NOT NULL,
	"dependent_node_id" uuid NOT NULL,
	"blocker_node_type" "node_type",
	"blocker_node_id" uuid,
	"external_label" text,
	"state" "dep_state" DEFAULT 'active' NOT NULL,
	"resolution_note" text,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" varchar(9) DEFAULT '#0055FF' NOT NULL,
	"sort_order" double precision DEFAULT 0 NOT NULL,
	"guide_person_ids" uuid[] DEFAULT '{}' NOT NULL,
	"collapsed" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_objective_id" uuid,
	"title" text NOT NULL,
	"notes" text,
	"status" "goal_status" DEFAULT 'not_started' NOT NULL,
	"target_horizon" text,
	"sort_order" double precision DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbox_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raw_text" text NOT NULL,
	"processed_at" timestamp with time zone,
	"promoted_to_type" "node_type",
	"promoted_to_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "initiatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"goal_id" uuid,
	"title" text NOT NULL,
	"notes" text,
	"gtd_status" "gtd_status" DEFAULT 'next' NOT NULL,
	"sort_order" double precision DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kernel_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kernel_id" uuid NOT NULL,
	"text" text NOT NULL,
	"linked_node_type" "node_type",
	"linked_node_id" uuid,
	"sort_order" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"horizon" text,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"sort_order" double precision DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"team" text,
	"email" text,
	"avatar_color" varchar(9) DEFAULT '#0055FF' NOT NULL,
	"wasender_phone" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "process_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_id" uuid NOT NULL,
	"step_no" integer NOT NULL,
	"text" text NOT NULL,
	"owner_person_id" uuid,
	"status" "step_status" DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_type" "node_type" NOT NULL,
	"node_id" uuid NOT NULL,
	"title" text NOT NULL,
	"sort_order" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_type" "node_type" NOT NULL,
	"node_id" uuid NOT NULL,
	"url" text NOT NULL,
	"type" "link_type" DEFAULT 'other' NOT NULL,
	"title" text,
	"preview_json" jsonb,
	"sort_order" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"notes" text,
	"checklist" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_kernels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"diagnosis" text,
	"guiding_principles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" "tag_kind" DEFAULT 'label' NOT NULL,
	"color" varchar(9)
);
--> statement-breakpoint
CREATE TABLE "task_tags" (
	"task_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_id" uuid,
	"initiative_id" uuid,
	"goal_id" uuid,
	"title" text NOT NULL,
	"notes" text,
	"gtd_status" "gtd_status" DEFAULT 'inbox' NOT NULL,
	"is_next_action" boolean DEFAULT false NOT NULL,
	"contexts" text[] DEFAULT '{}' NOT NULL,
	"energy" "energy",
	"time_estimate_min" integer,
	"priority" integer,
	"due_date" timestamp with time zone,
	"defer_until" timestamp with time zone,
	"assignee_person_id" uuid,
	"waiting_on_person_id" uuid,
	"waiting_since" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"completion_note" text,
	"sort_order" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_initiative_id_initiatives_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_thread_id_ai_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."ai_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_parent_objective_id_objectives_id_fk" FOREIGN KEY ("parent_objective_id") REFERENCES "public"."objectives"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "initiatives" ADD CONSTRAINT "initiatives_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "initiatives" ADD CONSTRAINT "initiatives_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kernel_actions" ADD CONSTRAINT "kernel_actions_kernel_id_strategy_kernels_id_fk" FOREIGN KEY ("kernel_id") REFERENCES "public"."strategy_kernels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_steps" ADD CONSTRAINT "process_steps_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_steps" ADD CONSTRAINT "process_steps_owner_person_id_people_id_fk" FOREIGN KEY ("owner_person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_kernels" ADD CONSTRAINT "strategy_kernels_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_initiative_id_initiatives_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_person_id_people_id_fk" FOREIGN KEY ("assignee_person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_waiting_on_person_id_people_id_fk" FOREIGN KEY ("waiting_on_person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_initiative_idx" ON "actions" USING btree ("initiative_id");--> statement-breakpoint
CREATE INDEX "activity_node_idx" ON "activity_log" USING btree ("node_type","node_id");--> statement-breakpoint
CREATE INDEX "ai_message_thread_idx" ON "ai_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "artefact_node_idx" ON "artefacts" USING btree ("node_type","node_id");--> statement-breakpoint
CREATE INDEX "dep_dependent_idx" ON "dependencies" USING btree ("dependent_node_type","dependent_node_id");--> statement-breakpoint
CREATE INDEX "initiative_domain_idx" ON "initiatives" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "kernel_action_kernel_idx" ON "kernel_actions" USING btree ("kernel_id");--> statement-breakpoint
CREATE INDEX "step_process_idx" ON "process_steps" USING btree ("process_id");--> statement-breakpoint
CREATE INDEX "process_node_idx" ON "processes" USING btree ("node_type","node_id");--> statement-breakpoint
CREATE INDEX "link_node_idx" ON "project_links" USING btree ("node_type","node_id");--> statement-breakpoint
CREATE INDEX "kernel_goal_idx" ON "strategy_kernels" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "task_tag_idx" ON "task_tags" USING btree ("task_id","tag_id");--> statement-breakpoint
CREATE INDEX "task_action_idx" ON "tasks" USING btree ("action_id");--> statement-breakpoint
CREATE INDEX "task_status_idx" ON "tasks" USING btree ("gtd_status");--> statement-breakpoint
CREATE INDEX "task_waiting_idx" ON "tasks" USING btree ("waiting_on_person_id");