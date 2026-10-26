/**
 * @vitest-environment node
 */
import {
  dbChainMockFns,
  flattenMockConditions,
  type MockCondition,
  queueTableRows,
  resetDbChainMock,
} from '@sim/testing/mocks/database.mock'
import { schemaMock } from '@sim/testing/mocks/schema.mock'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  deleteBatch,
  deleteFile,
  getBatch,
  getFile,
  getFileText,
  listBatches,
  listFiles,
  pendingLinesInScope,
  requestCancel,
  storedFileBytes,
} from '@/lib/nexora/batches/repository'

const keyA = { workspaceId: 'ws-1', apiKeyId: 'key-a' }
const site = { workspaceId: 'ws-1' }

/** The conditions of the nth `where` of the test (the last one by default). */
function conditions(index = -1): MockCondition[] {
  return flattenMockConditions(dbChainMockFns.where.mock.calls.at(index)?.[0])
}

function isKeyCondition(table: { apiKeyId: unknown }, keyId: string) {
  return (node: MockCondition) =>
    node.type === 'eq' && node.left === table.apiKeyId && node.right === keyId
}

const filesRestrictedToKey = (keyId: string) =>
  conditions().some(isKeyCondition(schemaMock.nexoraBatchFile, keyId))
const batchesRestrictedToKey = (keyId: string) =>
  conditions().some(isKeyCondition(schemaMock.nexoraBatch, keyId))

beforeEach(() => {
  resetDbChainMock()
})

describe('files and batches reached with an API key', () => {
  it('reads, lists and deletes only the files of that key', async () => {
    await getFile(keyA, 'file-1')
    expect(filesRestrictedToKey('key-a')).toBe(true)

    await getFileText(keyA, 'file-1')
    expect(filesRestrictedToKey('key-a')).toBe(true)

    await listFiles(keyA, { limit: 10 })
    expect(filesRestrictedToKey('key-a')).toBe(true)

    await deleteFile(keyA, 'file-1')
    expect(filesRestrictedToKey('key-a')).toBe(true)
  })

  it('reads, lists, cancels and deletes only the batches of that key', async () => {
    await getBatch(keyA, 'batch-1')
    expect(batchesRestrictedToKey('key-a')).toBe(true)

    await listBatches(keyA, { limit: 10 })
    expect(batchesRestrictedToKey('key-a')).toBe(true)

    await requestCancel(keyA, 'batch-1', new Date())
    expect(batchesRestrictedToKey('key-a')).toBe(true)

    await deleteBatch(keyA, 'batch-1')
    expect(batchesRestrictedToKey('key-a')).toBe(true)
  })

  it('keeps the whole workspace in view for the website, which has no key', async () => {
    await getFile(site, 'file-1')
    expect(conditions().some((node) => node.left === schemaMock.nexoraBatchFile.apiKeyId)).toBe(
      false
    )
    await getBatch(site, 'batch-1')
    expect(conditions().some((node) => node.left === schemaMock.nexoraBatch.apiKeyId)).toBe(false)
  })

  it('counts the waiting requests of the whole workspace, not of one key', async () => {
    await pendingLinesInScope(keyA)
    expect(batchesRestrictedToKey('key-a')).toBe(false)
  })
})

describe('storage used by the files of a workspace', () => {
  it('counts only the files that are not deleted, so deleting one frees its space', async () => {
    queueTableRows(schemaMock.nexoraBatchFile, [{ used: '4096' }])

    expect(await storedFileBytes(keyA)).toBe(4096)

    expect(
      conditions().some(
        (node) => node.type === 'isNull' && node.column === schemaMock.nexoraBatchFile.deletedAt
      )
    ).toBe(true)
    expect(filesRestrictedToKey('key-a')).toBe(false)
  })

  it('counts the input files only, whose text is stored', async () => {
    queueTableRows(schemaMock.nexoraBatchFile, [{ used: '0' }])
    await storedFileBytes(site)

    expect(
      conditions().some(
        (node) =>
          node.type === 'eq' &&
          node.left === schemaMock.nexoraBatchFile.purpose &&
          node.right === 'batch'
      )
    ).toBe(true)
  })
})

describe('erasing an input file', () => {
  it('deletes the requests and answers of the batches that read it', async () => {
    dbChainMockFns.returning.mockResolvedValueOnce([{ id: 'file-1' }])
    queueTableRows(schemaMock.nexoraBatch, [{ id: 'batch-1' }, { id: 'batch-2' }])

    expect(await deleteFile(site, 'file-1')).toBe(true)

    const erased = dbChainMockFns.delete.mock.calls.findIndex(
      ([table]) => table === schemaMock.nexoraBatchItem
    )
    expect(erased).toBeGreaterThanOrEqual(0)
    const batchIds = dbChainMockFns.where.mock.calls
      .flatMap(([condition]) => flattenMockConditions(condition))
      .find((node) => node.type === 'inArray' && node.column === schemaMock.nexoraBatchItem.batchId)
    expect(batchIds?.values).toEqual(['batch-1', 'batch-2'])
  })

  it('hides the output and error files of those batches too', async () => {
    dbChainMockFns.returning.mockResolvedValueOnce([{ id: 'file-1' }])
    queueTableRows(schemaMock.nexoraBatch, [{ id: 'batch-1' }])

    await deleteFile(site, 'file-1')

    const hidden = dbChainMockFns.set.mock.calls.filter(
      ([values]) => values && typeof values === 'object' && 'deletedAt' in values
    )
    expect(hidden).toHaveLength(2)
  })

  it('touches nothing else when the file is not the caller’s', async () => {
    dbChainMockFns.returning.mockResolvedValueOnce([])

    expect(await deleteFile(site, 'file-1')).toBe(false)
    expect(dbChainMockFns.delete).not.toHaveBeenCalled()
  })
})
