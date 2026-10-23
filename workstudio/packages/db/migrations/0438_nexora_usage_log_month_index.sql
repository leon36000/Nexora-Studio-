-- Month-to-date model usage across the instance (Nexora budgets and consumption): no other usage_log index leads with created_at.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_index WHERE indexrelid = to_regclass('usage_log_created_at_category_idx_failed')
      AND (indisvalid OR indrelid <> to_regclass('usage_log'))
  ) THEN
    RAISE EXCEPTION 'Refusing to drop unexpected recovery index usage_log_created_at_category_idx_failed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_index WHERE indexrelid = to_regclass('usage_log_created_at_category_idx')
      AND indrelid = to_regclass('usage_log') AND NOT indisvalid
  ) THEN
    ALTER INDEX "usage_log_created_at_category_idx" RENAME TO "usage_log_created_at_category_idx_failed";
  END IF;
END $$;
--> statement-breakpoint
COMMIT;
--> statement-breakpoint
SET lock_timeout = 0;
--> statement-breakpoint
DROP INDEX CONCURRENTLY IF EXISTS "usage_log_created_at_category_idx_failed";
--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS "usage_log_created_at_category_idx" ON "usage_log" USING btree ("created_at","category");
--> statement-breakpoint
SET lock_timeout = '5s';
