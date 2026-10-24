/**
 * @vitest-environment node
 */
import { createRouteContext } from '@sim/testing/helpers/http'
import { createMockRequest } from '@sim/testing/mocks/request.mock'
import { describe, expect, it } from 'vitest'
import { GET, POST } from '@/app/api/nexora/v1/[[...path]]/route'

describe('unknown developer API paths', () => {
  it('answers GET /v1 itself with a JSON 404 naming the endpoints, not an HTML page', async () => {
    const response = await GET(
      createMockRequest({ method: 'GET', url: 'http://localhost/api/nexora/v1' }),
      createRouteContext({})
    )

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      error: { code: 'unknown_endpoint', type: 'not_found_error' },
    })
  })

  it('answers an unknown path in the same shape', async () => {
    const response = await POST(
      createMockRequest({ method: 'POST', url: 'http://localhost/api/nexora/v1/responses' }),
      createRouteContext({ path: ['responses'] })
    )

    expect(response.status).toBe(404)
    expect((await response.json()).error.message).toContain('/v1/responses')
  })
})
