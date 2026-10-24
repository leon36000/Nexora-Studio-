-- Nexora edition: the agents published from the « Agents » page (and the general Assistant) were
-- deployed with include_thinking = true, which streamed a reasoning model's reasoning to every
-- visitor of a public agent. Members now get it from their session (chat route), so those chats
-- go back to false. Bounded to the chats of workflows in a top-level « Agents » folder; idempotent.
UPDATE "chat"
SET "include_thinking" = false, "updated_at" = now()
WHERE "include_thinking" = true
  AND "workflow_id" IN (
    SELECT "workflow"."id"
    FROM "workflow"
    INNER JOIN "folder" ON "folder"."id" = "workflow"."folder_id"
    WHERE "folder"."name" = 'Agents'
      AND "folder"."resource_type" = 'workflow'
      AND "folder"."parent_id" IS NULL
  );
