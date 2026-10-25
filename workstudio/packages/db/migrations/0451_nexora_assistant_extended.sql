CREATE TABLE "nexora_assistant_project" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nexora_assistant_project_file" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"size" integer NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nexora_assistant_task" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"workflow_id" text NOT NULL,
	"title" text NOT NULL,
	"request" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nexora_assistant_workflow" (
	"workspace_id" text NOT NULL,
	"workflow_id" text NOT NULL,
	"published_by" text,
	"published_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nexora_assistant_workflow_workspace_id_workflow_id_pk" PRIMARY KEY("workspace_id","workflow_id")
);
--> statement-breakpoint
CREATE TABLE "nexora_personal_connect_token" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"connect_token_id" text NOT NULL,
	"token_encrypted" text NOT NULL,
	"grant_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nexora_assistant_conversation" ADD COLUMN "project_id" text;--> statement-breakpoint
ALTER TABLE "nexora_assistant_conversation" ADD COLUMN "project_version" integer;--> statement-breakpoint
ALTER TABLE "nexora_assistant_message" ADD COLUMN "kind" text;--> statement-breakpoint
ALTER TABLE "nexora_assistant_message" ADD COLUMN "payload" jsonb;--> statement-breakpoint
ALTER TABLE "nexora_assistant_project" ADD CONSTRAINT "nexora_assistant_project_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_assistant_project" ADD CONSTRAINT "nexora_assistant_project_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_assistant_project_file" ADD CONSTRAINT "nexora_assistant_project_file_project_id_nexora_assistant_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."nexora_assistant_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_assistant_task" ADD CONSTRAINT "nexora_assistant_task_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_assistant_task" ADD CONSTRAINT "nexora_assistant_task_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_assistant_task" ADD CONSTRAINT "nexora_assistant_task_workflow_id_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_assistant_workflow" ADD CONSTRAINT "nexora_assistant_workflow_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_assistant_workflow" ADD CONSTRAINT "nexora_assistant_workflow_workflow_id_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_assistant_workflow" ADD CONSTRAINT "nexora_assistant_workflow_published_by_user_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_personal_connect_token" ADD CONSTRAINT "nexora_personal_connect_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_personal_connect_token" ADD CONSTRAINT "nexora_personal_connect_token_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nexora_assistant_project_owner_idx" ON "nexora_assistant_project" USING btree ("workspace_id","user_id","updated_at");--> statement-breakpoint
CREATE INDEX "nexora_assistant_project_file_project_idx" ON "nexora_assistant_project_file" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "nexora_assistant_task_workflow_idx" ON "nexora_assistant_task" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "nexora_assistant_task_owner_idx" ON "nexora_assistant_task" USING btree ("workspace_id","user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "nexora_personal_connect_token_member_idx" ON "nexora_personal_connect_token" USING btree ("user_id","workspace_id");