/**
 * @vitest-environment node
 */
import {
  dbChainMockFns,
  flattenMockConditions,
  resetDbChainMock,
} from '@sim/testing/mocks/database.mock'
import { schemaMock } from '@sim/testing/mocks/schema.mock'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  completeItem,
  failItem,
  type ItemResult,
  releaseItem,
} from '@/lib/nexora/evaluations/repository'

const NOW = new Date('2026-10-25T10:00:00Z')

const result: ItemResult = {
  answer: 'Oui',
  verdict: 'pass',
  score: 1,
  judgeNote: 'ok',
  latencyMs: 120,
  inputTokens: 10,
  outputTokens: 5,
  kgCo2eq: null,
  executionId: null,
}

function requiresClaimedAttempt(attempt: number) {
  const condition = dbChainMockFns.where.mock.calls.at(-1)?.[0]
  return flattenMockConditions(condition).some(
    (node) =>
      node.type === 'eq' &&
      node.left === schemaMock.nexoraEvalItem.attempt &&
      node.right === attempt
  )
}

beforeEach(() => {
  resetDbChainMock()
})

describe('items written after a lease takeover', () => {
  it('records a result only for the attempt that claimed the item', async () => {
    await completeItem('item-1', 2, result, NOW)

    expect(requiresClaimedAttempt(2)).toBe(true)
  })

  it('records a failure only for the attempt that claimed the item', async () => {
    await failItem('item-1', 3, 'Panne', null, NOW)

    expect(requiresClaimedAttempt(3)).toBe(true)
  })

  it('releases an item only for the attempt that claimed it', async () => {
    await releaseItem('item-1', 1)

    expect(requiresClaimedAttempt(1)).toBe(true)
  })

  it('ignores a stale write without raising', async () => {
    await expect(completeItem('item-1', 1, result, NOW)).resolves.toBeUndefined()
    await expect(failItem('item-1', 1, 'Panne', null, NOW)).resolves.toBeUndefined()
    await expect(releaseItem('item-1', 1)).resolves.toBeUndefined()
  })
})
