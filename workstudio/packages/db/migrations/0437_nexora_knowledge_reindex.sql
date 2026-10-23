CREATE TABLE "knowledge_reindex" (
	"knowledge_base_id" text PRIMARY KEY NOT NULL,
	"generation" text NOT NULL,
	"status" text NOT NULL,
	"source_model" text NOT NULL,
	"source_dimension" integer NOT NULL,
	"target_model" text NOT NULL,
	"target_dimension" integer NOT NULL,
	"total_chunks" integer DEFAULT 0 NOT NULL,
	"embedded_chunks" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"error" text,
	"requested_by" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "knowledge_reindex_status_check" CHECK ("knowledge_reindex"."status" IN ('running', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "knowledge_reindex_vector" (
	"embedding_id" text PRIMARY KEY NOT NULL,
	"knowledge_base_id" text NOT NULL,
	"generation" text NOT NULL,
	"chunk_hash" text NOT NULL,
	"vector" real[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_reindex" ADD CONSTRAINT "knowledge_reindex_knowledge_base_id_knowledge_base_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_base"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_reindex" ADD CONSTRAINT "knowledge_reindex_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_reindex_vector" ADD CONSTRAINT "knowledge_reindex_vector_embedding_id_embedding_id_fk" FOREIGN KEY ("embedding_id") REFERENCES "public"."embedding"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_reindex_vector" ADD CONSTRAINT "knowledge_reindex_vector_knowledge_base_id_knowledge_base_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_base"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knowledge_reindex_vector_kb_generation_idx" ON "knowledge_reindex_vector" USING btree ("knowledge_base_id","generation");