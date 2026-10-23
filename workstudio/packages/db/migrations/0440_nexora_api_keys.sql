CREATE TABLE "nexora_api_key" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"scope" text NOT NULL,
	"workspace_id" text,
	"created_by" text,
	"key_hash" text NOT NULL,
	"key_suffix" text NOT NULL,
	"allowed_models" jsonb,
	"allow_agents" boolean DEFAULT true NOT NULL,
	"monthly_token_cap" bigint,
	"requests_per_minute" integer DEFAULT 60 NOT NULL,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"revoked_by" text,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nexora_api_key_scope_check" CHECK (("nexora_api_key"."scope" = 'workspace' AND "nexora_api_key"."workspace_id" IS NOT NULL) OR ("nexora_api_key"."scope" = 'instance' AND "nexora_api_key"."workspace_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "nexora_api_key_usage" (
	"key_id" text NOT NULL,
	"day" date NOT NULL,
	"model" text NOT NULL,
	"requests" integer DEFAULT 0 NOT NULL,
	"prompt_tokens" bigint DEFAULT 0 NOT NULL,
	"completion_tokens" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "nexora_api_key_usage_key_id_day_model_pk" PRIMARY KEY("key_id","day","model")
);
--> statement-breakpoint
ALTER TABLE "nexora_api_key" ADD CONSTRAINT "nexora_api_key_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_api_key" ADD CONSTRAINT "nexora_api_key_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_api_key" ADD CONSTRAINT "nexora_api_key_revoked_by_user_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_api_key_usage" ADD CONSTRAINT "nexora_api_key_usage_key_id_nexora_api_key_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."nexora_api_key"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "nexora_api_key_hash_idx" ON "nexora_api_key" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "nexora_api_key_workspace_idx" ON "nexora_api_key" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "nexora_api_key_usage_day_idx" ON "nexora_api_key_usage" USING btree ("day");