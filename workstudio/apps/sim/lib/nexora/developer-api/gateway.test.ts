/**
 * @vitest-environment node
 */
import { nexoraBudgetsMock, nexoraBudgetsMockFns } from '@sim/testing/mocks/nexora-budgets.mock'
import { rateLimiterMock } from '@sim/testing/mocks/rate-limiter.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { repository, policy } = vi.hoisted(() => ({
  repository: {
    findNexoraApiKeyByHash: vi.fn(),
    hashNexoraApiKey: vi.fn((value: string) => value),
    reserveNexoraApiKeyTokens: vi.fn(),
    settleNexoraApiKeyTokens: vi.fn(async () => {}),
    touchNexoraApiKey: vi.fn(async () => {}),
  },
  policy: { keyModelConfig: vi.fn() },
}))

vi.mock('@/lib/core/rate-limiter', () => rateLimiterMock)
vi.mock('@/lib/nexora/consumption/budgets', () => nexoraBudgetsMock)
vi.mock('@/lib/nexora/developer-api/repository', () => repository)
vi.mock('@/lib/nexora/developer-api/key-model-policy', () => policy)
vi.mock('@/lib/nexora/developer-api/upstream', () => ({
  routerResolver: async () => (name: string) =>
    ({ 'nexora-default': 'cloud-glm-5-3', 'cloud-glm-5-3': 'cloud-glm-5-3' })[
      name.trim().toLowerCase()
    ] ?? null,
}))

import { admitModel, reserveSpending } from '@/lib/nexora/developer-api/gateway'
import type { GatewayKey } from '@/lib/nexora/developer-api/policy'

const KEY: GatewayKey = {
  id: 'key-1',
  name: 'n8n',
  scope: 'workspace',
  workspaceId: 'ws-1',
  createdBy: 'user-1',
  allowedModels: null,
  allowAgents: true,
  monthlyTokenCap: 1000,
  requestsPerMinute: 60,
  expiresAt: null,
  revokedAt: null,
}
const HANDLE = { keyId: 'key-1', day: '2026-10-23', model: 'cloud-glm-5-3', reservedTokens: 60 }

beforeEach(() => {
  policy.keyModelConfig.mockResolvedValue(null)
  repository.reserveNexoraApiKeyTokens.mockResolvedValue({ admitted: true, handle: HANDLE })
  nexoraBudgetsMockFns.mockCheckBudget.mockResolvedValue({
    allowed: true,
    reason: 'unconfigured',
    usage: null,
    cap: null,
  })
})

describe('admitModel', () => {
  it('refuses an all-models key a model its creator’s access group now denies', async () => {
    policy.keyModelConfig.mockResolvedValueOnce({
      deniedModels: ['vllm/cloud-glm-5-3'],
      allowedModelProviders: null,
    })

    await expect(admitModel(KEY, 'nexora-default')).rejects.toMatchObject({
      status: 403,
      code: 'model_not_allowed',
    })
  })

  it('records a call under the router an alias points to', async () => {
    expect(await admitModel(KEY, 'nexora-default')).toBe('cloud-glm-5-3')
    expect(await admitModel(KEY, 'inconnu')).toBe('inconnu')
  })
})

describe('reserveSpending', () => {
  const estimate = { promptTokens: 50, completionTokens: 10 }

  it('refuses with 429 once the key’s month is used up', async () => {
    repository.reserveNexoraApiKeyTokens.mockResolvedValueOnce({
      admitted: false,
      monthTokens: 1000,
    })

    await expect(reserveSpending(KEY, 'cloud-glm-5-3', estimate)).rejects.toMatchObject({
      status: 429,
      code: 'monthly_cap_reached',
    })
  })

  it('gives back the reservation of a call the workspace budget refuses', async () => {
    nexoraBudgetsMockFns.mockCheckBudget.mockResolvedValueOnce({
      allowed: false,
      reason: 'workspace',
      usage: 10,
      cap: 10,
      message: 'Budget atteint',
    })

    await expect(reserveSpending(KEY, 'cloud-glm-5-3', estimate)).rejects.toMatchObject({
      status: 402,
    })
    expect(repository.settleNexoraApiKeyTokens).toHaveBeenCalledWith({
      ...HANDLE,
      released: true,
    })
  })

  it('settles a reservation once, whatever else the call reports afterwards', async () => {
    const reservation = await reserveSpending(KEY, 'cloud-glm-5-3', estimate)

    await reservation.settle({ promptTokens: 40, completionTokens: 8 })
    await reservation.release()
    await reservation.settle({ promptTokens: 1, completionTokens: 1 })

    expect(repository.settleNexoraApiKeyTokens).toHaveBeenCalledTimes(1)
    expect(repository.settleNexoraApiKeyTokens).toHaveBeenCalledWith({
      ...HANDLE,
      promptTokens: 40,
      completionTokens: 8,
    })
  })
})
