CREATE TABLE "nexora_trace" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"user_id" text,
	"api_key_id" text,
	"source" text NOT NULL,
	"visibility" text DEFAULT 'workspace' NOT NULL,
	"name" text NOT NULL,
	"agent_id" text,
	"agent_name" text,
	"model" text,
	"models" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"started_at" timestamp NOT NULL,
	"duration_ms" integer NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"kg_co2eq" double precision,
	"span_count" integer DEFAULT 0 NOT NULL,
	"tool_count" integer DEFAULT 0 NOT NULL,
	"truncated" boolean DEFAULT false NOT NULL,
	"masked_count" integer DEFAULT 0 NOT NULL,
	"execution_id" text,
	"input_preview" text,
	"output_preview" text,
	"search_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nexora_trace_visibility_check" CHECK ("nexora_trace"."visibility" IN ('workspace', 'private'))
);
--> statement-breakpoint
CREATE TABLE "nexora_trace_span" (
	"trace_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"position" integer NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"model" text,
	"started_at" timestamp NOT NULL,
	"duration_ms" integer NOT NULL,
	"status" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"kg_co2eq" double precision,
	"input" text,
	"output" text,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "nexora_trace_span_trace_id_id_pk" PRIMARY KEY("trace_id","id")
);
--> statement-breakpoint
ALTER TABLE "nexora_trace" ADD CONSTRAINT "nexora_trace_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_trace" ADD CONSTRAINT "nexora_trace_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_trace" ADD CONSTRAINT "nexora_trace_api_key_id_nexora_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."nexora_api_key"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_trace_span" ADD CONSTRAINT "nexora_trace_span_trace_id_nexora_trace_id_fk" FOREIGN KEY ("trace_id") REFERENCES "public"."nexora_trace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nexora_trace_workspace_started_idx" ON "nexora_trace" USING btree ("workspace_id","started_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "nexora_trace_started_idx" ON "nexora_trace" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "nexora_trace_user_started_idx" ON "nexora_trace" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "nexora_trace_api_key_started_idx" ON "nexora_trace" USING btree ("api_key_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "nexora_trace_execution_idx" ON "nexora_trace" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "nexora_trace_span_order_idx" ON "nexora_trace_span" USING btree ("trace_id","position");