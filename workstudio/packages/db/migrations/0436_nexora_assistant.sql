CREATE TABLE "nexora_assistant_conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"workflow_id" text,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nexora_assistant_message" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"files" jsonb,
	"usage" jsonb,
	"interrupted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nexora_assistant_conversation" ADD CONSTRAINT "nexora_assistant_conversation_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_assistant_conversation" ADD CONSTRAINT "nexora_assistant_conversation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_assistant_conversation" ADD CONSTRAINT "nexora_assistant_conversation_workflow_id_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_assistant_message" ADD CONSTRAINT "nexora_assistant_message_conversation_id_nexora_assistant_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."nexora_assistant_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nexora_assistant_conversation_owner_idx" ON "nexora_assistant_conversation" USING btree ("workspace_id","user_id","updated_at");--> statement-breakpoint
CREATE INDEX "nexora_assistant_message_conversation_idx" ON "nexora_assistant_message" USING btree ("conversation_id","created_at");