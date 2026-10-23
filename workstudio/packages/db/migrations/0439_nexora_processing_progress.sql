-- Nexora: progress of a long reading or transcription kept on the document across processing slices, and the model of a staged reindex vector so a relaunch toward the same model reuses it. Both nullable, nothing reads them before this release.
ALTER TABLE "document" ADD COLUMN "processing_progress" jsonb;--> statement-breakpoint
ALTER TABLE "knowledge_reindex_vector" ADD COLUMN "target_model" text;
