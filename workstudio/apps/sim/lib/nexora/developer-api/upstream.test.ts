/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { upstreamError } from '@/lib/nexora/developer-api/upstream'

const refusal = (status: number, body: unknown = { detail: 'Invalid token' }) =>
  upstreamError(new Response(JSON.stringify(body), { status }), 'nexora-default')

describe('upstreamError', () => {
  it.each([401, 403])(
    'answers 502 when Nexora API refuses the instance’s own key (%i): the caller’s key is fine',
    async (status) => {
      const error = await refusal(status)
      expect(error).toMatchObject({ status: 502, code: 'upstream_error', type: 'api_error' })
      expect(error.message).not.toContain('Invalid token')
    }
  )

  it('passes a model rate limit on as a 429', async () => {
    expect(await refusal(429)).toMatchObject({ status: 429 })
  })

  it('answers 502 for a server error of Nexora API', async () => {
    expect(await refusal(500)).toMatchObject({ status: 502 })
  })
})
