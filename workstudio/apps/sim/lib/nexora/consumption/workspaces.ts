import { db } from '@sim/db'
import { workspace } from '@sim/db/schema'
import { asc, inArray } from 'drizzle-orm'

/** More workspaces than an SME instance holds; the budget picker lists them all below it. */
const MAX_LISTED_WORKSPACES = 1000

export interface BudgetWorkspace {
  id: string
  name: string
  status: 'active' | 'archived'
}

/** Every workspace of the instance, by name: the ones a monthly cap can be set on. */
export async function listBudgetWorkspaces(): Promise<BudgetWorkspace[]> {
  const rows = await db
    .select({ id: workspace.id, name: workspace.name, archivedAt: workspace.archivedAt })
    .from(workspace)
    .orderBy(asc(workspace.name))
    .limit(MAX_LISTED_WORKSPACES)
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.archivedAt ? 'archived' : 'active',
  }))
}

/** The ids among `ids` that name an existing workspace. */
export async function existingWorkspaceIds(ids: readonly string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set()
  const rows = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(inArray(workspace.id, [...ids]))
  return new Set(rows.map((row) => row.id))
}
