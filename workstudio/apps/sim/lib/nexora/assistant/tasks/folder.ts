import { db } from '@sim/db'
import { folder } from '@sim/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { createFolder } from '@/lib/folders/orchestration'

/** The workspace folder that holds the workflows behind members' scheduled tasks. */
export const TASKS_FOLDER = 'Tâches planifiées'

async function findTasksFolderId(workspaceId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: folder.id })
    .from(folder)
    .where(
      and(
        eq(folder.workspaceId, workspaceId),
        eq(folder.resourceType, 'workflow'),
        eq(folder.name, TASKS_FOLDER),
        isNull(folder.parentId),
        isNull(folder.deletedAt)
      )
    )
    .limit(1)
  return row?.id ?? null
}

/** The « Tâches planifiées » folder of the workspace, created by the first task that needs it. */
export async function ensureTasksFolder(workspaceId: string, userId: string): Promise<string> {
  const existing = await findTasksFolderId(workspaceId)
  if (existing) return existing
  const created = await createFolder({
    resourceType: 'workflow',
    workspaceId,
    userId,
    name: TASKS_FOLDER,
  })
  if (created.success && created.folder) return created.folder.id
  // Created meanwhile by someone else (the folder name is unique among its siblings).
  const raced = created.errorCode === 'conflict' ? await findTasksFolderId(workspaceId) : null
  if (raced) return raced
  throw new Error(created.error ?? 'Failed to create the scheduled tasks folder')
}
