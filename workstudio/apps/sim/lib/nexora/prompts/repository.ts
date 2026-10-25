import { db } from '@sim/db'
import { nexoraPrompt, nexoraPromptLabel, nexoraPromptVersion, user } from '@sim/db/schema'
import { getPostgresConstraintName, getPostgresErrorCode } from '@sim/utils/errors'
import { generateId } from '@sim/utils/id'
import { and, desc, eq, inArray, max, type SQL, sql } from 'drizzle-orm'
import {
  type CursorKey,
  type KeysetKey,
  keysetColumns,
  keysetPage,
  type ListSortOrder,
  listOrderBy,
  resumeKeyset,
  searchFilter,
  textKey,
  timestampKey,
} from '@/lib/api/list-query'
import { OrchestrationError } from '@/lib/core/orchestration/types'
import {
  PROMPT_LABELS,
  type PromptLabel,
  type PromptSelector,
  type PromptVariable,
} from '@/lib/nexora/prompts/template'

/** A prompt as lists show it: where each label points and how far its versions go. */
export interface PromptRecord {
  id: string
  workspaceId: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
  labels: Record<PromptLabel, number | null>
  latestVersion: number
}

export interface PromptVersionRecord {
  id: string
  promptId: string
  version: number
  content: string
  variables: PromptVariable[]
  note: string
  createdByName: string | null
  createdAt: Date
}

export interface PromptDetail extends PromptRecord {
  versions: PromptVersionRecord[]
}

export type PromptSortBy = 'name' | 'createdAt' | 'updatedAt'

interface NewVersionInput {
  workspaceId: string
  content: string
  variables: PromptVariable[]
  note: string
  createdBy: string | null
}

type PromptRow = typeof nexoraPrompt.$inferSelect
type Executor = Pick<typeof db, 'select'>

const PROMPT_NAME_INDEX = 'nexora_prompt_workspace_name_idx'

function nameTaken(name: string): OrchestrationError {
  return new OrchestrationError(
    'conflict',
    `Un prompt nommé « ${name} » existe déjà dans cet espace.`
  )
}

function promptNotFound(): OrchestrationError {
  return new OrchestrationError('not_found', 'Prompt introuvable')
}

function isNameClash(error: unknown): boolean {
  return (
    getPostgresErrorCode(error) === '23505' &&
    getPostgresConstraintName(error) === PROMPT_NAME_INDEX
  )
}

/** Labels and the latest version number of each prompt, keyed by prompt id. */
async function loadVersionFacts(
  executor: Executor,
  promptIds: string[]
): Promise<Map<string, Pick<PromptRecord, 'labels' | 'latestVersion'>>> {
  const facts = new Map<string, Pick<PromptRecord, 'labels' | 'latestVersion'>>()
  if (promptIds.length === 0) return facts
  const [latest, labels] = await Promise.all([
    executor
      .select({ promptId: nexoraPromptVersion.promptId, latest: max(nexoraPromptVersion.version) })
      .from(nexoraPromptVersion)
      .where(inArray(nexoraPromptVersion.promptId, promptIds))
      .groupBy(nexoraPromptVersion.promptId),
    executor
      .select({
        promptId: nexoraPromptLabel.promptId,
        label: nexoraPromptLabel.label,
        version: nexoraPromptVersion.version,
      })
      .from(nexoraPromptLabel)
      .innerJoin(nexoraPromptVersion, eq(nexoraPromptVersion.id, nexoraPromptLabel.versionId))
      .where(inArray(nexoraPromptLabel.promptId, promptIds)),
  ])
  for (const id of promptIds)
    facts.set(id, { labels: { production: null, test: null }, latestVersion: 0 })
  for (const row of latest) {
    const entry = facts.get(row.promptId)
    if (entry) entry.latestVersion = row.latest ?? 0
  }
  for (const row of labels) {
    const entry = facts.get(row.promptId)
    const label = PROMPT_LABELS.find((known) => known === row.label)
    if (entry && label) entry.labels[label] = row.version
  }
  return facts
}

async function toRecords(executor: Executor, rows: PromptRow[]): Promise<PromptRecord[]> {
  const facts = await loadVersionFacts(
    executor,
    rows.map((row) => row.id)
  )
  return rows.map((row) => ({
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    labels: facts.get(row.id)?.labels ?? { production: null, test: null },
    latestVersion: facts.get(row.id)?.latestVersion ?? 0,
  }))
}

async function recordOf(executor: Executor, row: PromptRow): Promise<PromptRecord> {
  const [record] = await toRecords(executor, [row])
  return record
}

const VERSION_COLUMNS = {
  id: nexoraPromptVersion.id,
  promptId: nexoraPromptVersion.promptId,
  version: nexoraPromptVersion.version,
  content: nexoraPromptVersion.content,
  variables: nexoraPromptVersion.variables,
  note: nexoraPromptVersion.note,
  createdByName: user.name,
  createdAt: nexoraPromptVersion.createdAt,
}

/** Creates a prompt with its version 1, which both labels point at. */
export async function insertPromptWithFirstVersion(
  input: NewVersionInput & { name: string; description: string }
): Promise<{ prompt: PromptRecord; version: PromptVersionRecord }> {
  try {
    return await db.transaction(async (tx) => {
      const now = new Date()
      const [row] = await tx
        .insert(nexoraPrompt)
        .values({
          id: generateId(),
          workspaceId: input.workspaceId,
          name: input.name,
          description: input.description,
          createdBy: input.createdBy,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
      const versionId = generateId()
      await tx.insert(nexoraPromptVersion).values({
        id: versionId,
        promptId: row.id,
        version: 1,
        content: input.content,
        variables: input.variables,
        note: input.note,
        createdBy: input.createdBy,
        createdAt: now,
      })
      await tx.insert(nexoraPromptLabel).values(
        PROMPT_LABELS.map((label) => ({
          promptId: row.id,
          label,
          versionId,
          updatedBy: input.createdBy,
          updatedAt: now,
        }))
      )
      const version = await readVersion(tx, eq(nexoraPromptVersion.id, versionId))
      if (!version) throw new Error('Prompt version vanished inside its own transaction')
      return { prompt: await recordOf(tx, row), version }
    })
  } catch (error) {
    if (isNameClash(error)) throw nameTaken(input.name)
    throw error
  }
}

async function readVersion(
  executor: Executor,
  condition: SQL | undefined
): Promise<PromptVersionRecord | null> {
  const [row] = await executor
    .select(VERSION_COLUMNS)
    .from(nexoraPromptVersion)
    .leftJoin(user, eq(user.id, nexoraPromptVersion.createdBy))
    .where(condition)
    .limit(1)
  return row ?? null
}

/**
 * Adds the next version of a workspace's prompt. The prompt's row is locked while the number is
 * chosen, so concurrent saves get consecutive numbers; labels stay where they were.
 */
export async function insertPromptVersion(
  input: NewVersionInput & { promptId: string }
): Promise<{ prompt: PromptRecord; version: PromptVersionRecord }> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(nexoraPrompt)
      .where(
        and(eq(nexoraPrompt.id, input.promptId), eq(nexoraPrompt.workspaceId, input.workspaceId))
      )
      .for('update')
    if (!row) throw promptNotFound()
    const [{ latest }] = await tx
      .select({ latest: max(nexoraPromptVersion.version) })
      .from(nexoraPromptVersion)
      .where(eq(nexoraPromptVersion.promptId, row.id))
    const now = new Date()
    const versionId = generateId()
    await tx.insert(nexoraPromptVersion).values({
      id: versionId,
      promptId: row.id,
      version: (latest ?? 0) + 1,
      content: input.content,
      variables: input.variables,
      note: input.note,
      createdBy: input.createdBy,
      createdAt: now,
    })
    const [updated] = await tx
      .update(nexoraPrompt)
      .set({ updatedAt: now })
      .where(eq(nexoraPrompt.id, row.id))
      .returning()
    const version = await readVersion(tx, eq(nexoraPromptVersion.id, versionId))
    if (!version) throw new Error('Prompt version vanished inside its own transaction')
    return { prompt: await recordOf(tx, updated), version }
  })
}

/** Points a label of a workspace's prompt at one of its versions. */
export async function movePromptLabel(input: {
  workspaceId: string
  promptId: string
  label: PromptLabel
  version: number
  updatedBy: string | null
}): Promise<{
  prompt: PromptRecord
  previousVersion: number | null
  version: number
  changed: boolean
}> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(nexoraPrompt)
      .where(
        and(eq(nexoraPrompt.id, input.promptId), eq(nexoraPrompt.workspaceId, input.workspaceId))
      )
      .for('update')
    if (!row) throw promptNotFound()
    const [target] = await tx
      .select({ id: nexoraPromptVersion.id })
      .from(nexoraPromptVersion)
      .where(
        and(
          eq(nexoraPromptVersion.promptId, row.id),
          eq(nexoraPromptVersion.version, input.version)
        )
      )
    if (!target) {
      throw new OrchestrationError('not_found', `Le prompt n'a pas de version ${input.version}.`)
    }
    const before = (await loadVersionFacts(tx, [row.id])).get(row.id)
    const previousVersion = before?.labels[input.label] ?? null
    if (previousVersion === input.version) {
      return {
        prompt: await recordOf(tx, row),
        previousVersion,
        version: input.version,
        changed: false,
      }
    }
    const now = new Date()
    await tx
      .insert(nexoraPromptLabel)
      .values({
        promptId: row.id,
        label: input.label,
        versionId: target.id,
        updatedBy: input.updatedBy,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [nexoraPromptLabel.promptId, nexoraPromptLabel.label],
        set: { versionId: target.id, updatedBy: input.updatedBy, updatedAt: now },
      })
    const [updated] = await tx
      .update(nexoraPrompt)
      .set({ updatedAt: now })
      .where(eq(nexoraPrompt.id, row.id))
      .returning()
    return {
      prompt: await recordOf(tx, updated),
      previousVersion,
      version: input.version,
      changed: true,
    }
  })
}

const promptIdKey = textKey<PromptRow>(nexoraPrompt.id, (row) => row.id)

const PROMPT_SORTS = {
  name: [
    textKey<PromptRow>(sql`lower(${nexoraPrompt.name})`, (row) => row.name.toLowerCase()),
    promptIdKey,
  ],
  createdAt: [timestampKey<PromptRow>(nexoraPrompt.createdAt, (row) => row.createdAt), promptIdKey],
  updatedAt: [timestampKey<PromptRow>(nexoraPrompt.updatedAt, (row) => row.updatedAt), promptIdKey],
} satisfies Record<PromptSortBy, readonly KeysetKey<PromptRow>[]>

/**
 * A workspace's prompts, optionally searched by name, sorted and keyset-paged. Without `limit`
 * the whole set comes back (the Prompts page and the agent pickers).
 */
export async function listPrompts(params: {
  workspaceId: string
  search?: string
  sortBy?: PromptSortBy
  sortOrder?: ListSortOrder
  limit?: number
  cursorKeys?: CursorKey[]
}): Promise<{ data: PromptRecord[]; nextCursorKeys: CursorKey[] | null }> {
  const { sortBy = 'name', sortOrder = 'asc', limit } = params
  const keys = PROMPT_SORTS[sortBy]
  const query = db
    .select()
    .from(nexoraPrompt)
    .where(
      and(
        eq(nexoraPrompt.workspaceId, params.workspaceId),
        searchFilter(nexoraPrompt.name, params.search),
        resumeKeyset(keys, params.cursorKeys, sortOrder)
      )
    )
    .orderBy(...listOrderBy(keysetColumns(keys), sortOrder))
  const rows = limit === undefined ? await query : await query.limit(limit + 1)
  const page = keysetPage(keys, rows, limit)
  return { data: await toRecords(db, page.data), nextCursorKeys: page.nextCursorKeys }
}

/** A workspace's prompt by id or, failing that, by name (case ignored); `null` when absent. */
export async function findPromptRow(
  workspaceId: string,
  idOrName: string
): Promise<PromptRow | null> {
  const [byId] = await db
    .select()
    .from(nexoraPrompt)
    .where(and(eq(nexoraPrompt.id, idOrName), eq(nexoraPrompt.workspaceId, workspaceId)))
    .limit(1)
  if (byId) return byId
  const [byName] = await db
    .select()
    .from(nexoraPrompt)
    .where(
      and(
        eq(nexoraPrompt.workspaceId, workspaceId),
        sql`lower(${nexoraPrompt.name}) = lower(${idOrName})`
      )
    )
    .limit(1)
  return byName ?? null
}

/** A workspace's prompt with every version, newest first; `null` when absent. */
export async function getPromptDetail(
  workspaceId: string,
  idOrName: string
): Promise<PromptDetail | null> {
  const row = await findPromptRow(workspaceId, idOrName)
  if (!row) return null
  const [record, versions] = await Promise.all([
    recordOf(db, row),
    db
      .select(VERSION_COLUMNS)
      .from(nexoraPromptVersion)
      .leftJoin(user, eq(user.id, nexoraPromptVersion.createdBy))
      .where(eq(nexoraPromptVersion.promptId, row.id))
      .orderBy(desc(nexoraPromptVersion.version)),
  ])
  return { ...record, versions }
}

/** One version of a prompt: the one a label points at, the latest, or a given number. */
export async function getPromptVersion(
  promptId: string,
  pick: { selector: PromptSelector } | { version: number }
): Promise<PromptVersionRecord | null> {
  if ('version' in pick) {
    return readVersion(
      db,
      and(eq(nexoraPromptVersion.promptId, promptId), eq(nexoraPromptVersion.version, pick.version))
    )
  }
  if (pick.selector === 'latest') {
    const [row] = await db
      .select(VERSION_COLUMNS)
      .from(nexoraPromptVersion)
      .leftJoin(user, eq(user.id, nexoraPromptVersion.createdBy))
      .where(eq(nexoraPromptVersion.promptId, promptId))
      .orderBy(desc(nexoraPromptVersion.version))
      .limit(1)
    return row ?? null
  }
  const [row] = await db
    .select(VERSION_COLUMNS)
    .from(nexoraPromptLabel)
    .innerJoin(nexoraPromptVersion, eq(nexoraPromptVersion.id, nexoraPromptLabel.versionId))
    .leftJoin(user, eq(user.id, nexoraPromptVersion.createdBy))
    .where(
      and(eq(nexoraPromptLabel.promptId, promptId), eq(nexoraPromptLabel.label, pick.selector))
    )
    .limit(1)
  return row ?? null
}

/** Deletes a workspace's prompt with its versions and labels; `null` when absent. */
export async function deletePrompt(
  workspaceId: string,
  promptId: string
): Promise<PromptRecord | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(nexoraPrompt)
      .where(and(eq(nexoraPrompt.id, promptId), eq(nexoraPrompt.workspaceId, workspaceId)))
      .for('update')
    if (!row) return null
    const record = await recordOf(tx, row)
    await tx.delete(nexoraPrompt).where(eq(nexoraPrompt.id, row.id))
    return record
  })
}
