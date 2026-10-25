/**
 * Versioned prompts against real PostgreSQL: the first version carries both labels, concurrent
 * versions get distinct numbers, a name is unique per workspace whatever its case, a label only
 * points at a version of its own prompt, another workspace never reads a prompt, and deleting a
 * prompt takes its versions and labels with it.
 */
import { db } from '@sim/db'
import {
  nexoraPrompt,
  nexoraPromptLabel,
  nexoraPromptVersion,
  permissions,
  user,
  workspace,
} from '@sim/db/schema'
import { deleteWorkspaceFixture, insertWorkspaceFixture } from '@sim/db/testing/workspace-fixtures'
import { generateId } from '@sim/utils/id'
import { eq, inArray } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { OrchestrationError } from '@/lib/core/orchestration/types'
import {
  deletePrompt,
  getPromptDetail,
  getPromptVersion,
  insertPromptVersion,
  insertPromptWithFirstVersion,
  listPrompts,
  movePromptLabel,
} from '@/lib/nexora/prompts/repository'

const userIds: string[] = []
const workspaceIds: string[] = []

async function seedWorkspace() {
  const userId = generateId()
  const workspaceId = generateId()
  userIds.push(userId)
  workspaceIds.push(workspaceId)
  const now = new Date()
  await db.insert(user).values({
    id: userId,
    name: 'Prompts fixture',
    email: `${userId}@prompts.test`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })
  await insertWorkspaceFixture(db, {
    id: workspaceId,
    name: 'Prompts fixture',
    ownerId: userId,
    billedAccountUserId: userId,
  })
  await db.insert(permissions).values({
    id: generateId(),
    userId,
    entityType: 'workspace',
    entityId: workspaceId,
    permissionType: 'admin',
  })
  return { userId, workspaceId }
}

async function createPrompt(workspaceId: string, userId: string, name = 'Support client') {
  return insertPromptWithFirstVersion({
    workspaceId,
    name,
    description: 'Ton des réponses du support',
    content: 'Réponds à {{client}} poliment.',
    variables: [{ name: 'client', type: 'text' }],
    note: 'Première version',
    createdBy: userId,
  })
}

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise
    return undefined
  } catch (error) {
    if (error instanceof OrchestrationError) return error.code
    throw error
  }
}

afterEach(async () => {
  if (workspaceIds.length > 0) {
    await db.delete(nexoraPrompt).where(inArray(nexoraPrompt.workspaceId, workspaceIds))
    await deleteWorkspaceFixture(db, inArray(workspace.id, workspaceIds.splice(0)))
  }
  if (userIds.length > 0) {
    await db.delete(permissions).where(inArray(permissions.userId, userIds))
    await db.delete(user).where(inArray(user.id, userIds.splice(0)))
  }
})

describe('creating a prompt', () => {
  it('stores version 1 and points production and test at it', async () => {
    const { userId, workspaceId } = await seedWorkspace()

    const { prompt, version } = await createPrompt(workspaceId, userId)

    expect(version.version).toBe(1)
    expect(prompt.labels).toEqual({ production: 1, test: 1 })
    expect(prompt.latestVersion).toBe(1)
    const detail = await getPromptDetail(workspaceId, prompt.id)
    expect(detail?.versions.map((v) => [v.version, v.note, v.createdByName])).toEqual([
      [1, 'Première version', 'Prompts fixture'],
    ])
  })

  it('refuses a name already taken in the workspace, whatever its case, as a conflict', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    await createPrompt(workspaceId, userId, 'Support client')

    expect(await codeOf(createPrompt(workspaceId, userId, 'SUPPORT CLIENT'))).toBe('conflict')
  })

  it('lets another workspace use the same name', async () => {
    const a = await seedWorkspace()
    const b = await seedWorkspace()
    await createPrompt(a.workspaceId, a.userId, 'Support client')

    const { prompt } = await createPrompt(b.workspaceId, b.userId, 'Support client')

    expect(prompt.workspaceId).toBe(b.workspaceId)
  })
})

describe('new versions', () => {
  it('number concurrent versions of one prompt without a gap or a clash', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const { prompt } = await createPrompt(workspaceId, userId)

    const created = await Promise.all(
      ['v-a', 'v-b', 'v-c'].map((note) =>
        insertPromptVersion({
          workspaceId,
          promptId: prompt.id,
          content: `Texte ${note}`,
          variables: [],
          note,
          createdBy: userId,
        })
      )
    )

    expect(created.map((entry) => entry.version.version).sort()).toEqual([2, 3, 4])
  })

  it('leave the labels where they were', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const { prompt } = await createPrompt(workspaceId, userId)

    const { prompt: after } = await insertPromptVersion({
      workspaceId,
      promptId: prompt.id,
      content: 'Réponds en une phrase.',
      variables: [],
      note: 'Plus court',
      createdBy: userId,
    })

    expect(after.labels).toEqual({ production: 1, test: 1 })
    expect(after.latestVersion).toBe(2)
  })

  it('are refused on a prompt of another workspace', async () => {
    const a = await seedWorkspace()
    const b = await seedWorkspace()
    const { prompt } = await createPrompt(a.workspaceId, a.userId)

    const attempt = insertPromptVersion({
      workspaceId: b.workspaceId,
      promptId: prompt.id,
      content: 'x',
      variables: [],
      note: '',
      createdBy: b.userId,
    })

    expect(await codeOf(attempt)).toBe('not_found')
  })
})

describe('moving a label', () => {
  it('points the label at the chosen version and reports where it was', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const { prompt } = await createPrompt(workspaceId, userId)
    await insertPromptVersion({
      workspaceId,
      promptId: prompt.id,
      content: 'Version 2',
      variables: [],
      note: '',
      createdBy: userId,
    })

    const moved = await movePromptLabel({
      workspaceId,
      promptId: prompt.id,
      label: 'production',
      version: 2,
      updatedBy: userId,
    })

    expect(moved).toMatchObject({ previousVersion: 1, version: 2, changed: true })
    expect(moved.prompt.labels).toEqual({ production: 2, test: 1 })
    expect((await getPromptVersion(prompt.id, { selector: 'production' }))?.content).toBe(
      'Version 2'
    )

    const back = await movePromptLabel({
      workspaceId,
      promptId: prompt.id,
      label: 'production',
      version: 1,
      updatedBy: userId,
    })
    expect(back.prompt.labels.production).toBe(1)
  })

  it('reports no change when the label already points at the version', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const { prompt } = await createPrompt(workspaceId, userId)

    const moved = await movePromptLabel({
      workspaceId,
      promptId: prompt.id,
      label: 'test',
      version: 1,
      updatedBy: userId,
    })

    expect(moved.changed).toBe(false)
  })

  it('refuses a version the prompt does not have', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const { prompt } = await createPrompt(workspaceId, userId)

    const attempt = movePromptLabel({
      workspaceId,
      promptId: prompt.id,
      label: 'production',
      version: 7,
      updatedBy: userId,
    })

    expect(await codeOf(attempt)).toBe('not_found')
    expect((await getPromptDetail(workspaceId, prompt.id))?.labels.production).toBe(1)
  })
})

describe('reading prompts', () => {
  it('finds a prompt by id or by name, never from another workspace', async () => {
    const a = await seedWorkspace()
    const b = await seedWorkspace()
    const { prompt } = await createPrompt(a.workspaceId, a.userId, 'Relance facture')

    expect((await getPromptDetail(a.workspaceId, prompt.id))?.id).toBe(prompt.id)
    expect((await getPromptDetail(a.workspaceId, 'relance FACTURE'))?.id).toBe(prompt.id)
    expect(await getPromptDetail(b.workspaceId, prompt.id)).toBeNull()
    expect(await getPromptDetail(b.workspaceId, 'Relance facture')).toBeNull()
  })

  it('selects a version by label, by number or as the latest', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const { prompt } = await createPrompt(workspaceId, userId)
    await insertPromptVersion({
      workspaceId,
      promptId: prompt.id,
      content: 'Version 2',
      variables: [],
      note: '',
      createdBy: userId,
    })

    expect((await getPromptVersion(prompt.id, { selector: 'production' }))?.version).toBe(1)
    expect((await getPromptVersion(prompt.id, { selector: 'latest' }))?.version).toBe(2)
    expect((await getPromptVersion(prompt.id, { version: 2 }))?.content).toBe('Version 2')
    expect(await getPromptVersion(prompt.id, { version: 9 })).toBeNull()
  })

  it('pages the list by name with a cursor that resumes after the last row', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    for (const name of ['Charlie', 'alpha', 'Bravo']) await createPrompt(workspaceId, userId, name)

    const first = await listPrompts({ workspaceId, sortBy: 'name', sortOrder: 'asc', limit: 2 })
    const second = await listPrompts({
      workspaceId,
      sortBy: 'name',
      sortOrder: 'asc',
      limit: 2,
      cursorKeys: first.nextCursorKeys ?? undefined,
    })

    expect(first.data.map((p) => p.name)).toEqual(['alpha', 'Bravo'])
    expect(second.data.map((p) => p.name)).toEqual(['Charlie'])
    expect(second.nextCursorKeys).toBeNull()
    expect(first.data[0].labels).toEqual({ production: 1, test: 1 })
  })
})

describe('deleting a prompt', () => {
  it('removes its versions and labels, and only in its own workspace', async () => {
    const a = await seedWorkspace()
    const b = await seedWorkspace()
    const { prompt } = await createPrompt(a.workspaceId, a.userId)

    expect(await deletePrompt(b.workspaceId, prompt.id)).toBeNull()
    const deleted = await deletePrompt(a.workspaceId, prompt.id)

    expect(deleted?.name).toBe('Support client')
    const versions = await db
      .select({ id: nexoraPromptVersion.id })
      .from(nexoraPromptVersion)
      .where(eq(nexoraPromptVersion.promptId, prompt.id))
    const labels = await db
      .select({ label: nexoraPromptLabel.label })
      .from(nexoraPromptLabel)
      .where(eq(nexoraPromptLabel.promptId, prompt.id))
    expect(versions).toEqual([])
    expect(labels).toEqual([])
  })
})
