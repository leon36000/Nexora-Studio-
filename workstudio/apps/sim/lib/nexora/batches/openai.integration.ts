/**
 * The OpenAI-facing batch service against real PostgreSQL: a file or a batch of another workspace
 * is a 404, an input file is checked when the batch is created (line numbers in the failure), the
 * model must exist and be allowed for the key, the queue of waiting requests is capped, a finished
 * batch cannot be cancelled, and the output and error files read back the results line by line.
 */
import { db } from '@sim/db'
import { nexoraApiKey, nexoraBatchItem, permissions, user, workspace } from '@sim/db/schema'
import { deleteWorkspaceFixture, insertWorkspaceFixture } from '@sim/db/testing/workspace-fixtures'
import { generateId } from '@sim/utils/id'
import { eq, inArray } from 'drizzle-orm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  type BatchApiDeps,
  cancelBatch,
  createBatch,
  createFile,
  deleteFile,
  listBatches,
  listFiles,
  readFileContent,
  retrieveBatch,
  retrieveFile,
} from '@/lib/nexora/batches/openai'
import * as repository from '@/lib/nexora/batches/repository'
import {
  acquireBatch,
  claimNextItem,
  completeItem,
  failItem,
  finishBatch,
  insertBatchWithItems,
} from '@/lib/nexora/batches/repository'
import { GatewayError, gatewayErrors } from '@/lib/nexora/developer-api/errors'
import type { GatewayCall } from '@/lib/nexora/developer-api/gateway'
import type { GatewayKey } from '@/lib/nexora/developer-api/policy'

const workspaceIds: string[] = []

async function seedWorkspace(): Promise<string> {
  const userId = generateId()
  const workspaceId = generateId()
  workspaceIds.push(workspaceId)
  const now = new Date()
  await db.insert(user).values({
    id: userId,
    name: 'Lots OpenAI fixture',
    email: `${userId}@batches-openai.test`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })
  await insertWorkspaceFixture(db, {
    id: workspaceId,
    name: 'Lots OpenAI fixture',
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
  return workspaceId
}

afterEach(async () => {
  if (instanceKeyIds.length > 0) {
    await db.delete(nexoraApiKey).where(inArray(nexoraApiKey.id, instanceKeyIds.splice(0)))
  }
  if (workspaceIds.length > 0) {
    await deleteWorkspaceFixture(db, inArray(workspace.id, workspaceIds.splice(0)))
  }
})

const instanceKeyIds: string[] = []

/** A call made with a real key row (the batches reference the key). */
async function callFor(workspaceId: string | null): Promise<GatewayCall> {
  const id = generateId()
  await db.insert(nexoraApiKey).values({
    id,
    name: 'Clé de test',
    scope: workspaceId ? 'workspace' : 'instance',
    workspaceId,
    keyHash: `hash-${id}`,
    keySuffix: id.slice(-4),
  })
  if (!workspaceId) instanceKeyIds.push(id)
  const key: GatewayKey = {
    id,
    name: 'Clé de test',
    scope: workspaceId ? 'workspace' : 'instance',
    workspaceId,
    createdBy: null,
    allowedModels: null,
    allowAgents: false,
    monthlyTokenCap: null,
    requestsPerMinute: 60,
    expiresAt: null,
    revokedAt: null,
  }
  return { key, headers: { 'x-ratelimit-limit-requests': '60' } }
}

function deps(overrides: Partial<BatchApiDeps> = {}): BatchApiDeps {
  return {
    now: () => new Date('2026-10-25T10:00:00Z'),
    repo: repository,
    admitModel: async (_key, model) => model,
    modelExists: async (model) => model !== 'modele-inconnu',
    start: vi.fn(),
    abort: vi.fn(),
    ...overrides,
  }
}

const chatLine = (customId: string, model = 'qwen2.5:7b') =>
  JSON.stringify({
    custom_id: customId,
    method: 'POST',
    url: '/v1/chat/completions',
    body: { model, messages: [{ role: 'user', content: `Question ${customId}` }] },
  })

async function upload(call: GatewayCall, text: string, d = deps()) {
  return createFile(call, { filename: 'lot.jsonl', text, purpose: 'batch' }, d)
}

async function launch(call: GatewayCall, lines: string[], d = deps()) {
  const file = await upload(call, lines.join('\n'), d)
  return createBatch(
    call,
    { input_file_id: file.id, endpoint: '/v1/chat/completions', completion_window: '24h' },
    d
  )
}

async function refusal(promise: Promise<unknown>): Promise<GatewayError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof GatewayError) return error
    throw error
  }
  throw new Error('expected a refusal')
}

describe('files', () => {
  it('stores a batch file and describes it like OpenAI', async () => {
    const call = await callFor(await seedWorkspace())
    const file = await upload(call, `${chatLine('a')}\n${chatLine('b')}\n`)
    expect(file).toMatchObject({
      object: 'file',
      purpose: 'batch',
      filename: 'lot.jsonl',
      status: 'processed',
      expires_at: null,
    })
    expect(file.id).toMatch(/^file-/)
    expect(file.bytes).toBeGreaterThan(0)
    expect((await retrieveFile(call, file.id, deps())).id).toBe(file.id)
  })

  it('accepts only the batch purpose', async () => {
    const call = await callFor(await seedWorkspace())
    const error = await refusal(
      createFile(call, { filename: 'a.jsonl', text: '{}', purpose: 'assistants' }, deps())
    )
    expect(error.status).toBe(400)
  })

  it('refuses a file over the size limit', async () => {
    const call = await callFor(await seedWorkspace())
    const error = await refusal(
      createFile(
        call,
        { filename: 'a.jsonl', text: 'x'.repeat(26 * 1024 * 1024), purpose: 'batch' },
        deps()
      )
    )
    expect(error.status).toBe(413)
  })

  it('does not show a file to another workspace, nor to an instance key', async () => {
    const mine = await callFor(await seedWorkspace())
    const other = await callFor(await seedWorkspace())
    const instance = await callFor(null)
    const file = await upload(mine, chatLine('a'))
    for (const stranger of [other, instance]) {
      expect((await refusal(retrieveFile(stranger, file.id, deps()))).status).toBe(404)
      expect((await refusal(readFileContent(stranger, file.id, deps()))).status).toBe(404)
      expect((await refusal(deleteFile(stranger, file.id, deps()))).status).toBe(404)
    }
    expect((await listFiles(other, {}, deps())).data).toEqual([])
  })

  it('lists newest first, filters by purpose and pages with a cursor', async () => {
    const call = await callFor(await seedWorkspace())
    const first = await upload(call, chatLine('a'))
    const second = await upload(call, chatLine('b'))
    const page = await listFiles(call, { limit: 1, purpose: 'batch' }, deps())
    expect(page).toMatchObject({ object: 'list', has_more: true, first_id: second.id })
    const next = await listFiles(call, { limit: 1, after: second.id }, deps())
    expect(next.data.map((file) => file.id)).toEqual([first.id])
    expect(next.has_more).toBe(false)
    expect((await listFiles(call, { purpose: 'batch_output' }, deps())).data).toEqual([])
  })

  it('deletes a file and no longer serves it', async () => {
    const call = await callFor(await seedWorkspace())
    const file = await upload(call, chatLine('a'))
    expect(await deleteFile(call, file.id, deps())).toEqual({
      id: file.id,
      object: 'file',
      deleted: true,
    })
    expect((await refusal(retrieveFile(call, file.id, deps()))).status).toBe(404)
  })

  it('serves an input file’s text back', async () => {
    const call = await callFor(await seedWorkspace())
    const text = `${chatLine('a')}\n`
    const file = await upload(call, text)
    const content = await readFileContent(call, file.id, deps())
    expect(await new Response(content.body).text()).toBe(text)
  })
})

describe('creating a batch', () => {
  it('creates an in-progress batch with its requests and starts it', async () => {
    const call = await callFor(await seedWorkspace())
    const d = deps()
    const batch = await launch(call, [chatLine('a'), chatLine('b'), chatLine('c')], d)
    expect(batch).toMatchObject({
      object: 'batch',
      endpoint: '/v1/chat/completions',
      status: 'in_progress',
      completion_window: '24h',
      request_counts: { total: 3, completed: 0, failed: 0 },
      output_file_id: null,
      error_file_id: null,
      errors: null,
    })
    expect(batch.id).toMatch(/^batch_/)
    expect(d.start).toHaveBeenCalledWith(batch.id)
    expect(batch.expires_at).toBe(Math.floor(Date.parse('2026-10-26T10:00:00Z') / 1000))
  })

  it('honours the completion window and the metadata', async () => {
    const call = await callFor(await seedWorkspace())
    const file = await upload(call, chatLine('a'))
    const batch = await createBatch(
      call,
      {
        input_file_id: file.id,
        endpoint: '/v1/chat/completions',
        completion_window: '72h',
        metadata: { projet: 'avis' },
      },
      deps()
    )
    expect(batch.completion_window).toBe('72h')
    expect(batch.metadata).toEqual({ projet: 'avis' })
  })

  it.each([
    ['an unknown endpoint', { endpoint: '/v1/completions' }],
    ['a bad window', { completion_window: '500h' }],
    [
      'too many metadata keys',
      { metadata: Object.fromEntries(Array.from({ length: 17 }, (_, i) => [`k${i}`, 'v'])) },
    ],
    ['a metadata value that is not text', { metadata: { a: 3 } }],
  ])('refuses %s', async (_name, patch) => {
    const call = await callFor(await seedWorkspace())
    const file = await upload(call, chatLine('a'))
    const error = await refusal(
      createBatch(
        call,
        { input_file_id: file.id, endpoint: '/v1/chat/completions', ...patch } as never,
        deps()
      )
    )
    expect(error.status).toBe(400)
  })

  it('answers 404 for a file that does not exist or belongs to another workspace', async () => {
    const mine = await callFor(await seedWorkspace())
    const other = await callFor(await seedWorkspace())
    const file = await upload(mine, chatLine('a'))
    for (const id of ['file-inconnu', file.id]) {
      const error = await refusal(
        createBatch(other, { input_file_id: id, endpoint: '/v1/chat/completions' }, deps())
      )
      expect(error.status).toBe(404)
    }
  })

  it('records a batch whose file is invalid as failed, with the lines to fix', async () => {
    const call = await callFor(await seedWorkspace())
    const d = deps()
    const batch = await launch(call, [chatLine('a'), '{pas du json', chatLine('a')], d)
    expect(batch.status).toBe('failed')
    expect(batch.errors?.data.map((entry) => [entry.code, entry.line])).toEqual([
      ['invalid_json_line', 2],
      ['duplicate_custom_id', 3],
    ])
    expect(d.start).not.toHaveBeenCalled()
    expect((await retrieveBatch(call, batch.id, d)).status).toBe('failed')
  })

  it('refuses a model the key may not call, before creating anything', async () => {
    const call = await callFor(await seedWorkspace())
    const d = deps({
      admitModel: async (_key, model) => {
        throw gatewayErrors.modelNotAllowed(model, ['glm'])
      },
    })
    const file = await upload(call, chatLine('a'), d)
    const error = await refusal(
      createBatch(call, { input_file_id: file.id, endpoint: '/v1/chat/completions' }, d)
    )
    expect(error.status).toBe(403)
    expect((await listBatches(call, {}, d)).data).toEqual([])
  })

  it('refuses a model the instance does not serve', async () => {
    const call = await callFor(await seedWorkspace())
    const d = deps()
    const file = await upload(call, chatLine('a', 'modele-inconnu'), d)
    const error = await refusal(
      createBatch(call, { input_file_id: file.id, endpoint: '/v1/chat/completions' }, d)
    )
    expect(error.status).toBe(404)
    expect(error.code).toBe('model_not_found')
  })

  it('refuses a batch that would pass the cap of waiting requests', async () => {
    const workspaceId = await seedWorkspace()
    const call = await callFor(workspaceId)
    await insertBatchWithItems(
      {
        scope: { workspaceId },
        apiKeyId: null,
        createdBy: null,
        source: 'api',
        endpoint: '/v1/chat/completions',
        model: 'm',
        concurrency: 2,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
      Array.from({ length: 5 }, (_, position) => ({
        position,
        customId: `x${position}`,
        request: { model: 'm', messages: [] },
      }))
    )
    const d = deps({ pendingLimit: 6 })
    const file = await upload(call, [chatLine('a'), chatLine('b')].join('\n'), d)
    const error = await refusal(
      createBatch(call, { input_file_id: file.id, endpoint: '/v1/chat/completions' }, d)
    )
    expect(error).toMatchObject({ status: 429, code: 'batch_queue_full' })
  })
})

describe('reading and cancelling', () => {
  it('does not show a batch to another workspace', async () => {
    const mine = await callFor(await seedWorkspace())
    const other = await callFor(await seedWorkspace())
    const batch = await launch(mine, [chatLine('a')])
    expect((await refusal(retrieveBatch(other, batch.id, deps()))).status).toBe(404)
    expect((await refusal(cancelBatch(other, batch.id, deps()))).status).toBe(404)
    expect((await listBatches(other, {}, deps())).data).toEqual([])
  })

  it('lists newest first with a cursor', async () => {
    const call = await callFor(await seedWorkspace())
    const first = await launch(call, [chatLine('a')])
    const second = await launch(call, [chatLine('b')])
    const page = await listBatches(call, { limit: 1 }, deps())
    expect(page).toMatchObject({ has_more: true, first_id: second.id, last_id: second.id })
    expect((await listBatches(call, { limit: 1, after: second.id }, deps())).data[0].id).toBe(
      first.id
    )
  })

  it('cancels a running batch: cancelling, calls interrupted, the batch started so that it finishes', async () => {
    const call = await callFor(await seedWorkspace())
    const d = deps()
    const batch = await launch(call, [chatLine('a'), chatLine('b')], d)
    const cancelling = await cancelBatch(call, batch.id, d)
    expect(cancelling.status).toBe('cancelling')
    expect(d.abort).toHaveBeenCalledWith(batch.id)
    expect(d.start).toHaveBeenCalledTimes(2)
  })

  it('does not cancel a batch that already ended', async () => {
    const call = await callFor(await seedWorkspace())
    const d = deps()
    const batch = await launch(call, [chatLine('a')], d)
    await acquireBatch(batch.id, 'p', new Date(), new Date(Date.now() + 60_000))
    await finishBatch(batch.id, 'p', 'cancelled', new Date())
    const error = await refusal(cancelBatch(call, batch.id, d))
    expect(error).toMatchObject({ status: 409, code: 'batch_not_cancellable' })
  })
})

describe('keys of one workspace', () => {
  it('keeps the files and batches of a key out of reach of another key of the same workspace', async () => {
    const workspaceId = await seedWorkspace()
    const keyA = await callFor(workspaceId)
    const keyB = await callFor(workspaceId)
    const d = deps()
    const batch = await launch(keyA, [chatLine('a')], d)
    const file = await upload(keyA, chatLine('b'), d)

    expect((await refusal(retrieveFile(keyB, file.id, d))).status).toBe(404)
    expect((await refusal(readFileContent(keyB, file.id, d))).status).toBe(404)
    expect((await refusal(deleteFile(keyB, file.id, d))).status).toBe(404)
    expect((await refusal(retrieveBatch(keyB, batch.id, d))).status).toBe(404)
    expect((await refusal(cancelBatch(keyB, batch.id, d))).status).toBe(404)
    expect((await listFiles(keyB, {}, d)).data).toEqual([])
    expect((await listBatches(keyB, {}, d)).data).toEqual([])

    expect((await retrieveFile(keyA, file.id, d)).id).toBe(file.id)
    expect((await retrieveBatch(keyA, batch.id, d)).id).toBe(batch.id)
    expect((await listBatches(keyA, {}, d)).data.map((entry) => entry.id)).toEqual([batch.id])
    expect((await cancelBatch(keyA, batch.id, d)).status).toBe('cancelling')
  })

  it('shares the storage quota of the workspace between its keys', async () => {
    const workspaceId = await seedWorkspace()
    const keyA = await callFor(workspaceId)
    const keyB = await callFor(workspaceId)
    const text = chatLine('a')
    const quotaBytes = Buffer.byteLength(text, 'utf8') * 2 - 1
    const d = deps({ filesQuotaBytes: quotaBytes })

    const first = await upload(keyA, text, d)
    expect((await refusal(upload(keyB, text, d))).status).toBe(429)

    await deleteFile(keyA, first.id, d)
    expect((await upload(keyB, text, d)).object).toBe('file')
  })
})

describe('erasing an input file', () => {
  it('leaves no trace of the requests and answers of the batches that read it', async () => {
    const call = await callFor(await seedWorkspace())
    const d = deps()
    const batch = await launch(call, [chatLine('secret-a'), chatLine('secret-b')], d)
    const now = new Date()
    await acquireBatch(batch.id, 'p', now, new Date(now.getTime() + 60_000))
    const claimed = await claimNextItem(batch.id, now)
    await completeItem(
      claimed?.id ?? '',
      {
        response: { status_code: 200, request_id: 'req_1', body: { id: 'cmpl-1' } },
        answer: 'réponse confidentielle',
        promptTokens: 5,
        completionTokens: 2,
        latencyMs: 10,
      },
      now
    )
    await finishBatch(batch.id, 'p', 'cancelled', now)
    const ended = await retrieveBatch(call, batch.id, d)
    const outputId = ended.output_file_id ?? ''
    const inputId = ended.input_file_id ?? ''

    await deleteFile(call, inputId, d)

    expect(
      await db.select().from(nexoraBatchItem).where(eq(nexoraBatchItem.batchId, batch.id))
    ).toEqual([])
    expect((await refusal(readFileContent(call, outputId, d))).status).toBe(404)
    expect((await refusal(readFileContent(call, inputId, d))).status).toBe(404)
  })

  it('stops a batch still running when its input file is deleted', async () => {
    const call = await callFor(await seedWorkspace())
    const d = deps()
    const batch = await launch(call, [chatLine('a')], d)

    await deleteFile(call, batch.input_file_id ?? '', d)

    expect((await retrieveBatch(call, batch.id, d)).status).toBe('cancelling')
    expect(
      await db.select().from(nexoraBatchItem).where(eq(nexoraBatchItem.batchId, batch.id))
    ).toEqual([])
  })
})

describe('result files', () => {
  async function finishedBatch() {
    const call = await callFor(await seedWorkspace())
    const d = deps()
    const batch = await launch(call, [chatLine('a'), chatLine('b'), chatLine('c')], d)
    const now = new Date()
    await acquireBatch(batch.id, 'p', now, new Date(now.getTime() + 60_000))
    const first = await claimNextItem(batch.id, now)
    await completeItem(
      first?.id ?? '',
      {
        response: { status_code: 200, request_id: 'req_1', body: { id: 'cmpl-1' } },
        answer: null,
        promptTokens: 5,
        completionTokens: 2,
        latencyMs: 10,
      },
      now
    )
    const second = await claimNextItem(batch.id, now)
    await failItem(
      second?.id ?? '',
      { code: 'invalid_request', message: 'Refusé', status: 400 },
      { status_code: 400, request_id: 'req_2', body: { error: { message: 'Refusé' } } },
      10,
      now
    )
    await finishBatch(batch.id, 'p', 'cancelled', now)
    return { call, d, batchId: batch.id }
  }

  it('exposes the output and error files of an ended batch, one JSON line per request', async () => {
    const { call, d, batchId } = await finishedBatch()
    const batch = await retrieveBatch(call, batchId, d)
    expect(batch.status).toBe('cancelled')
    expect(batch.request_counts).toEqual({ total: 3, completed: 1, failed: 2 })
    expect(batch.usage).toEqual({ input_tokens: 5, output_tokens: 2, total_tokens: 7 })
    expect(batch.output_file_id).not.toBeNull()
    expect(batch.error_file_id).not.toBeNull()

    const output = await readFileContent(call, batch.output_file_id ?? '', d)
    const outputLines = (await new Response(output.body).text())
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l))
    expect(outputLines).toHaveLength(1)
    expect(outputLines[0]).toMatchObject({
      custom_id: 'a',
      error: null,
      response: { status_code: 200, body: { id: 'cmpl-1' } },
    })

    const errors = await readFileContent(call, batch.error_file_id ?? '', d)
    const errorLines = (await new Response(errors.body).text())
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l))
    expect(errorLines.map((line) => [line.custom_id, line.error.code])).toEqual([
      ['b', 'invalid_request'],
      ['c', 'batch_cancelled'],
    ])
    expect(errorLines[0].response.status_code).toBe(400)
    expect(errorLines[1].response).toBeNull()
  })

  it('describes the result files in the files list', async () => {
    const { call, d } = await finishedBatch()
    const files = await listFiles(call, { purpose: 'batch_output' }, d)
    expect(files.data.map((file) => file.purpose)).toEqual(['batch_output', 'batch_output'])
  })
})
