CREATE TABLE "nexora_prompt" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nexora_prompt_label" (
	"prompt_id" text NOT NULL,
	"label" text NOT NULL,
	"version_id" text NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nexora_prompt_label_prompt_id_label_pk" PRIMARY KEY("prompt_id","label")
);
--> statement-breakpoint
CREATE TABLE "nexora_prompt_version" (
	"id" text PRIMARY KEY NOT NULL,
	"prompt_id" text NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nexora_prompt" ADD CONSTRAINT "nexora_prompt_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_prompt" ADD CONSTRAINT "nexora_prompt_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_prompt_label" ADD CONSTRAINT "nexora_prompt_label_prompt_id_nexora_prompt_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."nexora_prompt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_prompt_label" ADD CONSTRAINT "nexora_prompt_label_version_id_nexora_prompt_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."nexora_prompt_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_prompt_label" ADD CONSTRAINT "nexora_prompt_label_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_prompt_version" ADD CONSTRAINT "nexora_prompt_version_prompt_id_nexora_prompt_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."nexora_prompt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_prompt_version" ADD CONSTRAINT "nexora_prompt_version_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "nexora_prompt_workspace_name_idx" ON "nexora_prompt" USING btree ("workspace_id",lower("name"));--> statement-breakpoint
CREATE INDEX "nexora_prompt_workspace_updated_idx" ON "nexora_prompt" USING btree ("workspace_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "nexora_prompt_version_number_idx" ON "nexora_prompt_version" USING btree ("prompt_id","version");