CREATE TABLE "nexora_eval_alert" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"target_key" text NOT NULL,
	"target_label" text NOT NULL,
	"kind" text NOT NULL,
	"pass_rate" real,
	"threshold" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp,
	"acknowledged_by" text,
	CONSTRAINT "nexora_eval_alert_kind_check" CHECK ("nexora_eval_alert"."kind" IN ('below_threshold', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "nexora_eval_campaign" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"dataset_id" text NOT NULL,
	"judge_id" text NOT NULL,
	"targets" jsonb NOT NULL,
	"concurrency" integer DEFAULT 2 NOT NULL,
	"alert_threshold" real,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"schedule_id" text,
	"item_total" integer DEFAULT 0 NOT NULL,
	"lease_owner" text,
	"lease_until" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	CONSTRAINT "nexora_eval_campaign_status_check" CHECK ("nexora_eval_campaign"."status" IN ('pending', 'running', 'completed', 'cancelled', 'interrupted', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "nexora_eval_dataset" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nexora_eval_item" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"row_id" text NOT NULL,
	"target_key" text NOT NULL,
	"position" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt" integer DEFAULT 0 NOT NULL,
	"input" text NOT NULL,
	"expected" text,
	"guidance" text,
	"answer" text,
	"verdict" text,
	"score" real,
	"judge_note" text,
	"error" text,
	"latency_ms" integer,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"kg_co2eq" double precision,
	"execution_id" text,
	"started_at" timestamp,
	"finished_at" timestamp,
	CONSTRAINT "nexora_eval_item_status_check" CHECK ("nexora_eval_item"."status" IN ('pending', 'running', 'done', 'error')),
	CONSTRAINT "nexora_eval_item_verdict_check" CHECK ("nexora_eval_item"."verdict" IS NULL OR "nexora_eval_item"."verdict" IN ('pass', 'fail', 'error'))
);
--> statement-breakpoint
CREATE TABLE "nexora_eval_judge" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"config" jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nexora_eval_row" (
	"id" text PRIMARY KEY NOT NULL,
	"dataset_id" text NOT NULL,
	"position" integer NOT NULL,
	"input" text NOT NULL,
	"expected" text,
	"guidance" text,
	"candidate" text,
	"human_verdict" text,
	"human_note" text,
	"source_ref" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nexora_eval_row_verdict_check" CHECK ("nexora_eval_row"."human_verdict" IS NULL OR "nexora_eval_row"."human_verdict" IN ('pass', 'fail'))
);
--> statement-breakpoint
CREATE TABLE "nexora_eval_schedule" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"cron" text NOT NULL,
	"timezone" text NOT NULL,
	"dataset_id" text NOT NULL,
	"judge_id" text NOT NULL,
	"targets" jsonb NOT NULL,
	"concurrency" integer DEFAULT 2 NOT NULL,
	"alert_threshold" real,
	"enabled" boolean DEFAULT true NOT NULL,
	"next_run_at" timestamp,
	"last_run_at" timestamp,
	"last_campaign_id" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nexora_eval_alert" ADD CONSTRAINT "nexora_eval_alert_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_eval_alert" ADD CONSTRAINT "nexora_eval_alert_campaign_id_nexora_eval_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."nexora_eval_campaign"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_eval_alert" ADD CONSTRAINT "nexora_eval_alert_acknowledged_by_user_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_eval_campaign" ADD CONSTRAINT "nexora_eval_campaign_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_eval_campaign" ADD CONSTRAINT "nexora_eval_campaign_dataset_id_nexora_eval_dataset_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."nexora_eval_dataset"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_eval_campaign" ADD CONSTRAINT "nexora_eval_campaign_judge_id_nexora_eval_judge_id_fk" FOREIGN KEY ("judge_id") REFERENCES "public"."nexora_eval_judge"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_eval_campaign" ADD CONSTRAINT "nexora_eval_campaign_schedule_id_nexora_eval_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."nexora_eval_schedule"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_eval_campaign" ADD CONSTRAINT "nexora_eval_campaign_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_eval_dataset" ADD CONSTRAINT "nexora_eval_dataset_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_eval_dataset" ADD CONSTRAINT "nexora_eval_dataset_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_eval_item" ADD CONSTRAINT "nexora_eval_item_campaign_id_nexora_eval_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."nexora_eval_campaign"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_eval_judge" ADD CONSTRAINT "nexora_eval_judge_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_eval_judge" ADD CONSTRAINT "nexora_eval_judge_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_eval_row" ADD CONSTRAINT "nexora_eval_row_dataset_id_nexora_eval_dataset_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."nexora_eval_dataset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_eval_schedule" ADD CONSTRAINT "nexora_eval_schedule_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_eval_schedule" ADD CONSTRAINT "nexora_eval_schedule_dataset_id_nexora_eval_dataset_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."nexora_eval_dataset"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_eval_schedule" ADD CONSTRAINT "nexora_eval_schedule_judge_id_nexora_eval_judge_id_fk" FOREIGN KEY ("judge_id") REFERENCES "public"."nexora_eval_judge"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_eval_schedule" ADD CONSTRAINT "nexora_eval_schedule_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "nexora_eval_alert_slot_idx" ON "nexora_eval_alert" USING btree ("campaign_id","target_key","kind");--> statement-breakpoint
CREATE INDEX "nexora_eval_alert_open_idx" ON "nexora_eval_alert" USING btree ("workspace_id","acknowledged_at");--> statement-breakpoint
CREATE INDEX "nexora_eval_campaign_workspace_idx" ON "nexora_eval_campaign" USING btree ("workspace_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "nexora_eval_campaign_lease_idx" ON "nexora_eval_campaign" USING btree ("status","lease_until");--> statement-breakpoint
CREATE INDEX "nexora_eval_campaign_dataset_idx" ON "nexora_eval_campaign" USING btree ("dataset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nexora_eval_dataset_workspace_name_idx" ON "nexora_eval_dataset" USING btree ("workspace_id",lower("name"));--> statement-breakpoint
CREATE INDEX "nexora_eval_dataset_workspace_updated_idx" ON "nexora_eval_dataset" USING btree ("workspace_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "nexora_eval_item_pair_idx" ON "nexora_eval_item" USING btree ("campaign_id","row_id","target_key");--> statement-breakpoint
CREATE INDEX "nexora_eval_item_queue_idx" ON "nexora_eval_item" USING btree ("campaign_id","status","position");--> statement-breakpoint
CREATE UNIQUE INDEX "nexora_eval_judge_workspace_name_idx" ON "nexora_eval_judge" USING btree ("workspace_id",lower("name"));--> statement-breakpoint
CREATE INDEX "nexora_eval_row_dataset_idx" ON "nexora_eval_row" USING btree ("dataset_id","position");--> statement-breakpoint
CREATE INDEX "nexora_eval_schedule_due_idx" ON "nexora_eval_schedule" USING btree ("enabled","next_run_at");--> statement-breakpoint
CREATE INDEX "nexora_eval_schedule_workspace_idx" ON "nexora_eval_schedule" USING btree ("workspace_id");