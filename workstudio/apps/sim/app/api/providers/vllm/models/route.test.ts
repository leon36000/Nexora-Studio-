import { authMockFns, createMockRequest, resetEnvMock, setEnv } from '@sim/testing'
import { providersUtilsMock, providersUtilsMockFns } from '@sim/testing/mocks/providers-utils.mock'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearGatewayModelsCache } from '@/lib/nexora/gateway-models-cache'

const { mockFetch, mockResolveGatewayAccess } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockResolveGatewayAccess: vi.fn(),
}))

vi.mock('@/providers/utils', () => providersUtilsMock)
vi.mock('@/lib/nexora/gateway-access', () => ({
  resolveGatewayAccess: (...args: unknown[]) => mockResolveGatewayAccess(...args),
}))

import { GET } from '@/app/api/providers/vllm/models/route'

const { mockFilterBlacklistedModels, mockIsProviderBlacklisted } = providersUtilsMockFns

const request = () => createMockRequest('GET')

describe('vLLM models route', () => {
  beforeEach(() => {
    mockFilterBlacklistedModels.mockImplementation((models: string[]) => models)
    mockIsProviderBlacklisted.mockReturnValue(false)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'local-model' }] }),
    })
    vi.stubGlobal('fetch', mockFetch)
    setEnv({ VLLM_BASE_URL: 'http://localhost:8000', VLLM_API_KEY: undefined })
  })

  afterAll(resetEnvMock)

  it('uses an existing /v1 prefix once and forwards bearer authentication', async () => {
    setEnv({ VLLM_BASE_URL: 'http://localhost:1234/v1', VLLM_API_KEY: 'lm-token' })

    await GET(request())

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:1234/v1/models',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer lm-token',
          'Content-Type': 'application/json',
        },
      })
    )
  })

  it('returns an empty model list when the configured base URL is unsupported', async () => {
    setEnv({ VLLM_BASE_URL: 'http://localhost:1234?token=value' })

    const response = await GET(request())

    await expect(response.json()).resolves.toEqual({ models: [] })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  describe('with the site\u2019s model gateway', () => {
    const getModels = () => GET(request(), undefined)
    const access = {
      baseUrl: 'https://nexora.example/v1',
      apiKey: 'nxk_payer_0123456789',
      model: 'nexora/payer-default',
    }

    beforeEach(() => {
      setEnv({
        VLLM_BASE_URL: 'http://nexora-api:8000/v1',
        VLLM_API_KEY: 'sk-workstudio',
        NEXORA_GATEWAY_URL: 'https://nexora.example/v1',
      })
      authMockFns.mockGetSession.mockResolvedValue({ user: { id: 'user-1' } })
      clearGatewayModelsCache()
      mockResolveGatewayAccess.mockReset().mockResolvedValue(access)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ id: 'nexora/m1' }, { id: 'nexora/m2' }] }),
      })
    })

    it('lists the models of the signed-in person\u2019s own key, the default first', async () => {
      const response = await getModels()

      expect(mockResolveGatewayAccess).toHaveBeenCalledWith({ userId: 'user-1' })
      expect(mockFetch).toHaveBeenCalledWith(
        'https://nexora.example/v1/models',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer nxk_payer_0123456789',
            'Content-Type': 'application/json',
          },
        })
      )
      await expect(response.json()).resolves.toEqual({
        models: ['vllm/nexora-default', 'vllm/nexora/m1', 'vllm/nexora/m2'],
      })
    })

    it('asks the gateway once a minute, not on every page, for the same person', async () => {
      await getModels()
      const second = await getModels()

      expect(mockFetch).toHaveBeenCalledTimes(1)
      await expect(second.json()).resolves.toEqual({
        models: ['vllm/nexora-default', 'vllm/nexora/m1', 'vllm/nexora/m2'],
      })
    })

    it('never shows one person the list kept for another', async () => {
      await getModels()
      authMockFns.mockGetSession.mockResolvedValue({ user: { id: 'user-2' } })
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ id: 'nexora/only-for-two' }] }),
      })

      const response = await getModels()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      await expect(response.json()).resolves.toEqual({
        models: ['vllm/nexora-default', 'vllm/nexora/only-for-two'],
      })
    })

    it('does not keep a failure: the next page asks again', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Unavailable' })
      const failed = await getModels()
      await expect(failed.json()).resolves.toEqual({ models: [] })

      const retried = await getModels()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      await expect(retried.json()).resolves.toEqual({
        models: ['vllm/nexora-default', 'vllm/nexora/m1', 'vllm/nexora/m2'],
      })
    })

    it('lists nothing, and asks nobody, without a signed-in person', async () => {
      authMockFns.mockGetSession.mockResolvedValue(null)

      const response = await getModels()

      await expect(response.json()).resolves.toEqual({ models: [] })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('lists nothing, rather than the instance\u2019s models, when the gateway cannot say who pays', async () => {
      mockResolveGatewayAccess.mockRejectedValue(new Error('Nexora AI ne répond pas'))

      const response = await getModels()

      await expect(response.json()).resolves.toEqual({ models: [] })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('keeps the instance\u2019s models for an operator account that never used the site', async () => {
      mockResolveGatewayAccess.mockResolvedValue(null)

      await getModels()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://nexora-api:8000/v1/models',
        expect.objectContaining({
          headers: { Authorization: 'Bearer sk-workstudio', 'Content-Type': 'application/json' },
        })
      )
    })
  })
})
