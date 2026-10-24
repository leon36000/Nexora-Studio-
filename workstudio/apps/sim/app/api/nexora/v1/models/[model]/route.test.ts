/**
 * @vitest-environment node
 */
import { createRouteContext } from '@sim/testing/helpers/http'
import { createMockRequest } from '@sim/testing/mocks/request.mock'
import { describe, expect, it, vi } from 'vitest'

const { retrieveGatewayModel } = vi.hoisted(() => ({
  retrieveGatewayModel: vi.fn(async (_call: unknown, id: string) => ({
    id,
    object: 'model',
    owned_by: 'nexora',
  })),
}))

vi.mock('@/lib/nexora/developer-api/gateway', () => ({
  authenticateGatewayCall: async () => ({ key: { id: 'key-1' }, headers: {} }),
}))
vi.mock('@/lib/nexora/developer-api/models', () => ({ retrieveGatewayModel }))

import { GET } from '@/app/api/nexora/v1/models/[model]/route'

describe('GET /v1/models/{model}', () => {
  it('looks the model up by the id Next already decoded, without decoding it again', async () => {
    const request = createMockRequest({
      method: 'GET',
      url: 'http://localhost/api/nexora/v1/models/qwen%20100%25',
    })

    const response = await GET(request, createRouteContext({ model: 'qwen 100%' }))

    expect(response.status).toBe(200)
    expect(retrieveGatewayModel).toHaveBeenCalledWith(expect.anything(), 'qwen 100%')
  })
})
