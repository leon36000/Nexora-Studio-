import { setEnv } from '@sim/testing/mocks/env.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  piiServiceStatus,
  resetPiiServiceStatusCache,
} from '@/lib/nexora/data-protection/service-status'

describe('piiServiceStatus', () => {
  beforeEach(() => {
    resetPiiServiceStatusCache()
  })

  it('is not configured, and asks nobody, without PII_URL', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    setEnv({ PII_URL: undefined })
    expect(await piiServiceStatus()).toEqual({ configured: false, reachable: false })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('is reachable when the health check answers', async () => {
    const fetchSpy = vi.fn(async () => new Response('{"status":"ok"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)
    setEnv({ PII_URL: 'http://pii:5001/' })
    expect(await piiServiceStatus()).toEqual({ configured: true, reachable: true })
    expect(fetchSpy).toHaveBeenCalledWith('http://pii:5001/health', expect.anything())
  })

  it('is configured but unreachable when the service is down', async () => {
    setEnv({ PII_URL: 'http://pii:5001' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNREFUSED')
      })
    )
    expect(await piiServiceStatus()).toEqual({ configured: true, reachable: false })
  })

  it('is unreachable when the service answers with an error', async () => {
    setEnv({ PII_URL: 'http://pii:5001' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 503 }))
    )
    expect(await piiServiceStatus()).toEqual({ configured: true, reachable: false })
  })

  it('remembers an answer for a few seconds, not for every call', async () => {
    const fetchSpy = vi.fn(async () => new Response('', { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)
    setEnv({ PII_URL: 'http://pii:5001' })
    await piiServiceStatus()
    await piiServiceStatus()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
