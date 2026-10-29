CREATE TABLE "nexora_gateway_key" (
	"user_id" text PRIMARY KEY NOT NULL,
	"key_encrypted" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nexora_gateway_key" ADD CONSTRAINT "nexora_gateway_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;