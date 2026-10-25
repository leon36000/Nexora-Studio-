CREATE TABLE "nexora_batch" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"api_key_id" text,
	"created_by" text,
	"source" text NOT NULL,
	"name" text,
	"endpoint" text NOT NULL,
	"model" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"input_file_id" text,
	"output_file_id" text,
	"error_file_id" text,
	"metadata" jsonb,
	"config" jsonb,
	"table_id" text,
	"concurrency" integer DEFAULT 2 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"completed" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"errors" jsonb,
	"lease_owner" text,
	"lease_until" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	"cancel_requested_at" timestamp,
	CONSTRAINT "nexora_batch_source_check" CHECK ("nexora_batch"."source" IN ('api', 'table')),
	CONSTRAINT "nexora_batch_status_check" CHECK ("nexora_batch"."status" IN ('in_progress', 'cancelling', 'completed', 'failed', 'expired', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "nexora_batch_file" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"api_key_id" text,
	"purpose" text NOT NULL,
	"output_kind" text,
	"batch_id" text,
	"filename" text NOT NULL,
	"bytes" integer DEFAULT 0 NOT NULL,
	"line_count" integer DEFAULT 0 NOT NULL,
	"content" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "nexora_batch_file_purpose_check" CHECK ("nexora_batch_file"."purpose" IN ('batch', 'batch_output')),
	CONSTRAINT "nexora_batch_file_output_kind_check" CHECK ("nexora_batch_file"."output_kind" IS NULL OR "nexora_batch_file"."output_kind" IN ('output', 'error'))
);
--> statement-breakpoint
CREATE TABLE "nexora_batch_item" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"position" integer NOT NULL,
	"custom_id" text NOT NULL,
	"request" jsonb NOT NULL,
	"row_ref" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt" integer DEFAULT 0 NOT NULL,
	"response" jsonb,
	"answer" text,
	"error" jsonb,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer,
	"started_at" timestamp,
	"finished_at" timestamp,
	CONSTRAINT "nexora_batch_item_status_check" CHECK ("nexora_batch_item"."status" IN ('pending', 'running', 'done', 'error'))
);
--> statement-breakpoint
ALTER TABLE "nexora_batch" ADD CONSTRAINT "nexora_batch_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_batch" ADD CONSTRAINT "nexora_batch_api_key_id_nexora_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."nexora_api_key"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_batch" ADD CONSTRAINT "nexora_batch_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_batch_file" ADD CONSTRAINT "nexora_batch_file_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_batch_file" ADD CONSTRAINT "nexora_batch_file_api_key_id_nexora_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."nexora_api_key"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_batch_item" ADD CONSTRAINT "nexora_batch_item_batch_id_nexora_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."nexora_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nexora_batch_scope_idx" ON "nexora_batch" USING btree ("workspace_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "nexora_batch_lease_idx" ON "nexora_batch" USING btree ("status","lease_until");--> statement-breakpoint
CREATE INDEX "nexora_batch_file_scope_idx" ON "nexora_batch_file" USING btree ("workspace_id","purpose","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "nexora_batch_file_batch_idx" ON "nexora_batch_file" USING btree ("batch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nexora_batch_item_custom_idx" ON "nexora_batch_item" USING btree ("batch_id","custom_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nexora_batch_item_position_idx" ON "nexora_batch_item" USING btree ("batch_id","position");--> statement-breakpoint
CREATE INDEX "nexora_batch_item_queue_idx" ON "nexora_batch_item" USING btree ("batch_id","status","position");