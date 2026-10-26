/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest'
import {
  cancelBatch,
  createFile,
  deleteFile,
  listBatches,
  listFiles,
  readFileContent,
  retrieveBatch,
  retrieveFile,
  type BatchApiDeps,
} from '@/lib/nexora/batches/openai'
import type { BatchRecord, BatchScope, FileRecord } from '@/lib/nexora/batches/repository'
import { resolveFilesQuotaBytes } from '@/lib/nexora/batches/types'
import { GatewayError } from '@/lib/nexora/developer-api/errors'
import type { GatewayCall } from '@/lib/nexora/developer-api/gateway'
import type { GatewayKey } from '@/lib/nexora/developer-api/policy'

function keyOf(overrides: Partial<GatewayKey> = {}): GatewayKey {
  return {
    id: 'key-a',
    name: 'Clé A',
    scope: 'workspace',
    workspaceId: 'ws-1',
    createdBy: 'user-1',
    allowedModels: null,
    allowAgents: false,
    monthlyTokenCap: null,
    requestsPerMinute: 60,
    expiresAt: null,
    revokedAt: null,
    ...overrides,
  }
}

const callOf = (key: GatewayKey): GatewayCall => ({ key, headers: {} })

const file = (overrides: Partial<FileRecord> = {}): FileRecord => ({
  id: 'file-1',
  workspaceId: 'ws-1',
  apiKeyId: 'key-a',
  purpose: 'batch',
  outputKind: null,
  batchId: null,
  filename: 'lot.jsonl',
  bytes: 10,
  lineCount: 1,
  createdAt: new Date('2026-10-25T10:00:00Z'),
  ...overrides,
})

const batch = (overrides: Partial<BatchRecord> = {}): BatchRecord => ({
  id: 'batch_1',
  workspaceId: 'ws-1',
  apiKeyId: 'key-a',
  createdBy: null,
  source: 'api',
  name: null,
  endpoint: '/v1/chat/completions',
  model: 'nexora-default',
  status: 'in_progress',
  inputFileId: 'file-1',
  outputFileId: null,
  errorFileId: null,
  metadata: null,
  config: null,
  tableId: null,
  concurrency: 2,
  total: 1,
  completed: 0,
  failed: 0,
  promptTokens: 0,
  completionTokens: 0,
  errors: null,
  leaseOwner: null,
  leaseUntil: null,
  expiresAt: new Date('2026-10-26T10:00:00Z'),
  createdAt: new Date('2026-10-25T10:00:00Z'),
  startedAt: null,
  finishedAt: null,
  cancelRequestedAt: null,
  ...overrides,
})

/** Repository stand-in that records the scope of every call and keeps files in memory. */
function harness(options: { quotaBytes?: number } = {}) {
  const scopes: BatchScope[] = []
  const files = new Map<string, FileRecord>()
  const remember = (scope: BatchScope) => {
    scopes.push(scope)
    return scope
  }
  const deps: BatchApiDeps = {
    now: () => new Date('2026-10-25T10:00:00Z'),
    repo: {
      insertFile: vi.fn(async (input) => {
        remember(input.scope)
        const created = file({
          id: `file-${files.size + 1}`,
          bytes: Buffer.byteLength(input.text, 'utf8'),
        })
        files.set(created.id, created)
        return created
      }),
      getFile: vi.fn(async (scope, id) => {
        remember(scope)
        return files.get(id) ?? file({ id })
      }),
      getFileText: vi.fn(async (scope) => {
        remember(scope)
        return ''
      }),
      listFiles: vi.fn(async (scope) => {
        remember(scope)
        return { files: [], hasMore: false }
      }),
      deleteFile: vi.fn(async (scope, id) => {
        remember(scope)
        files.delete(id)
        return true
      }),
      storedFileBytes: vi.fn(async () =>
        [...files.values()].reduce((total, stored) => total + stored.bytes, 0)
      ),
      insertBatchWithItems: vi.fn(),
      insertFailedBatch: vi.fn(),
      getBatch: vi.fn(async (scope) => {
        remember(scope)
        return batch()
      }),
      listBatches: vi.fn(async (scope) => {
        remember(scope)
        return { batches: [], hasMore: false }
      }),
      pendingLinesInScope: vi.fn(async () => 0),
      requestCancel: vi.fn(async (scope) => {
        remember(scope)
        return batch({ status: 'cancelling' })
      }),
      listResults: vi.fn(async () => []),
      getResultFileBatch: vi.fn(async (scope) => {
        remember(scope)
        return null
      }),
    },
    admitModel: vi.fn(),
    modelExists: vi.fn(),
    start: vi.fn(),
    abort: vi.fn(),
    filesQuotaBytes: options.quotaBytes,
  }
  return { deps, scopes, files }
}

describe('files and batches of an API key', () => {
  it('reaches them with the key that calls, for a workspace key', async () => {
    const { deps, scopes } = harness()
    const call = callOf(keyOf({ id: 'key-b' }))

    await retrieveFile(call, 'file-1', deps)
    await listFiles(call, {}, deps)
    await deleteFile(call, 'file-1', deps)
    await readFileContent(call, 'file-1', deps)
    await retrieveBatch(call, 'batch_1', deps)
    await listBatches(call, {}, deps)
    await cancelBatch(call, 'batch_1', deps)

    expect(scopes.length).toBeGreaterThanOrEqual(7)
    for (const scope of scopes) {
      expect(scope).toEqual({ workspaceId: 'ws-1', apiKeyId: 'key-b' })
    }
  })

  it('reaches them with the key that calls, for an instance key', async () => {
    const { deps, scopes } = harness()
    const call = callOf(keyOf({ id: 'key-i', scope: 'instance', workspaceId: null }))

    await retrieveFile(call, 'file-1', deps)
    await retrieveBatch(call, 'batch_1', deps)

    for (const scope of scopes) {
      expect(scope).toEqual({ workspaceId: null, apiKeyId: 'key-i' })
    }
  })
})

describe('storage quota of the batch files', () => {
  const upload = (call: GatewayCall, text: string, deps: BatchApiDeps) =>
    createFile(call, { filename: 'lot.jsonl', text, purpose: 'batch' }, deps)

  it('refuses a file that would pass the quota, in OpenAI’s error shape and in French', async () => {
    const { deps } = harness({ quotaBytes: 100 })
    const call = callOf(keyOf())
    await upload(call, 'x'.repeat(80), deps)

    const refusal = await upload(call, 'y'.repeat(30), deps).catch((error: unknown) => error)

    expect(refusal).toBeInstanceOf(GatewayError)
    expect(refusal).toMatchObject({ status: 429, code: 'file_storage_full' })
    expect((refusal as GatewayError).message).toContain('Supprimez des fichiers')
    expect(deps.repo.insertFile).toHaveBeenCalledTimes(1)
  })

  it('accepts a file that fills the quota exactly', async () => {
    const { deps } = harness({ quotaBytes: 100 })
    const call = callOf(keyOf())
    await upload(call, 'x'.repeat(60), deps)

    await expect(upload(call, 'y'.repeat(40), deps)).resolves.toMatchObject({ object: 'file' })
  })

  it('accepts files again once one is deleted', async () => {
    const { deps } = harness({ quotaBytes: 100 })
    const call = callOf(keyOf())
    const stored = await upload(call, 'x'.repeat(90), deps)
    await expect(upload(call, 'y'.repeat(30), deps)).rejects.toBeInstanceOf(GatewayError)

    await deleteFile(call, stored.id, deps)

    await expect(upload(call, 'y'.repeat(30), deps)).resolves.toMatchObject({ object: 'file' })
  })

  it('counts the quota for the workspace, whichever key uploaded', async () => {
    const { deps } = harness({ quotaBytes: 100 })
    await upload(callOf(keyOf({ id: 'key-a' })), 'x'.repeat(90), deps)

    await expect(
      upload(callOf(keyOf({ id: 'key-b' })), 'y'.repeat(30), deps)
    ).rejects.toMatchObject({ code: 'file_storage_full' })
  })
})

describe('resolveFilesQuotaBytes', () => {
  it('reads megabytes from NEXORA_BATCH_FILES_QUOTA_MB and defaults to 1 Go', () => {
    expect(resolveFilesQuotaBytes('512')).toBe(512 * 1024 * 1024)
    expect(resolveFilesQuotaBytes(undefined)).toBe(1024 * 1024 * 1024)
    expect(resolveFilesQuotaBytes('')).toBe(1024 * 1024 * 1024)
    expect(resolveFilesQuotaBytes('0')).toBe(1024 * 1024 * 1024)
    expect(resolveFilesQuotaBytes('beaucoup')).toBe(1024 * 1024 * 1024)
    expect(resolveFilesQuotaBytes('-5')).toBe(1024 * 1024 * 1024)
  })
})
