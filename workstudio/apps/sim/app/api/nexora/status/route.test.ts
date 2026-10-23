import { dbChainMockFns } from '@sim/testing/mocks/database.mock'
import { setEnv } from '@sim/testing/mocks/env.mock'
import {
  nexoraAdminAccessMock,
  nexoraAdminAccessMockFns,
} from '@sim/testing/mocks/nexora-admin-access.mock'
import { redisConfigMockFns } from '@sim/testing/mocks/redis-config.mock'
import { urlsMockFns } from '@sim/testing/mocks/urls.mock'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/nexora/admin-access', () => nexoraAdminAccessMock)

import { GET } from '@/app/api/nexora/status/route'

const authorize = nexoraAdminAccessMockFns.mockAuthorizeInstanceAdmin
const fetchMock = vi.fn<typeof fetch>()

function request() {
  return new NextRequest('http://localhost/api/nexora/status')
}

describe('GET /api/nexora/status', () => {
  beforeEach(() => {
    authorize.mockResolvedValue({ ok: true, userId: 'u-1', organizationId: 'org-1' })
    setEnv({
      NEXORA_VERSION: '2.4.0',
      VLLM_BASE_URL: 'http://admin:s3cr3t-pass@nexora-api:8000/v1',
      VLLM_API_KEY: 'sk-nexora-secret-key',
      NEXORA_CONNECT_MCP_URL: 'http://nexora-connect:3000/mcp',
      NEXORA_CONNECT_ADMIN_URL: undefined,
      NEXORA_CONNECT_TOKEN: 'connect-runtime-secret',
      OLLAMA_URL: 'http://ollama:11434',
      SEARXNG_URL: '',
      NEXORA_WHISPER_URL: undefined,
    })
    urlsMockFns.mockGetSocketServerUrl.mockReturnValue('http://workstudio-realtime:3002')
    redisConfigMockFns.mockGetRedisClient
      .mockReset()
      .mockReturnValue({ ping: vi.fn().mockResolvedValue('PONG') })
    fetchMock.mockImplementation(async (input) => {
      const url = String(input)
      if (url.startsWith('http://nexora-api:8000')) return new Response('down', { status: 503 })
      if (url.startsWith('http://nexora-connect:3000')) throw new TypeError('fetch failed')
      return new Response('ok', { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  it('refuses a member who is not an instance admin, without probing anything', async () => {
    authorize.mockResolvedValue({ ok: false, status: 403 })
    const response = await GET(request(), {})
    expect(response.status).toBe(403)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(dbChainMockFns.execute).not.toHaveBeenCalled()
  })

  it('requires a session', async () => {
    authorize.mockResolvedValue({ ok: false, status: 401 })
    expect((await GET(request(), {})).status).toBe(401)
  })

  it('needs the instance organization, since the status covers every user', async () => {
    await GET(request(), {})
    expect(authorize).toHaveBeenCalledWith({ requireInstanceOrganization: true })
  })

  it('reports services that are down without failing', async () => {
    dbChainMockFns.execute.mockRejectedValueOnce(new Error('connection refused'))
    const response = await GET(request(), {})
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.version).toBe('2.4.0')
    expect(
      Object.fromEntries(body.services.map((s: { id: string; state: string }) => [s.id, s.state]))
    ).toEqual({
      postgres: 'down',
      redis: 'up',
      'nexora-api': 'down',
      'nexora-connect': 'down',
      realtime: 'up',
      ollama: 'up',
      searxng: 'not-configured',
      whisper: 'not-configured',
    })
  })

  it('probes internal health endpoints only, without credentials', async () => {
    await GET(request(), {})
    const urls = fetchMock.mock.calls.map(([input]) => String(input)).sort()
    expect(urls).toEqual([
      'http://nexora-api:8000/health',
      'http://nexora-connect:3000/health',
      'http://ollama:11434/api/version',
      'http://workstudio-realtime:3002/health',
    ])
  })

  it('never returns a secret or a service address', async () => {
    const text = await (await GET(request(), {})).text()
    for (const leak of [
      's3cr3t',
      'sk-nexora',
      'connect-runtime-secret',
      'http',
      'nexora-api:',
      '@',
    ]) {
      expect(text).not.toContain(leak)
    }
  })
})
