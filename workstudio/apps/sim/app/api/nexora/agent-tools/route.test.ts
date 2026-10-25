import { authMockFns } from '@sim/testing/mocks/auth.mock'
import { resetEnvMock, setEnv } from '@sim/testing/mocks/env.mock'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const gate = vi.hoisted(() => ({ enabled: vi.fn() }))

vi.mock('@/lib/nexora/code-execution', () => ({ isCodeExecutionEnabled: gate.enabled }))

import { GET } from '@/app/api/nexora/agent-tools/route'

const request = () => new NextRequest('http://localhost/api/nexora/agent-tools')

describe('GET /api/nexora/agent-tools', () => {
  beforeEach(() => {
    authMockFns.mockGetSession.mockResolvedValue({ user: { id: 'u-1' } })
    gate.enabled.mockResolvedValue(false)
  })
  afterEach(resetEnvMock)

  it('answers nobody who is not signed in', async () => {
    authMockFns.mockGetSession.mockResolvedValue(null)
    expect((await GET(request(), {})).status).toBe(401)
    expect(gate.enabled).not.toHaveBeenCalled()
  })

  it('offers neither built-in tool on a plain install', async () => {
    expect(await (await GET(request(), {})).json()).toEqual({
      codeInterpreter: false,
      webSearch: false,
    })
  })

  it('offers the interpreter once an administrator allowed it, and web search once SearXNG is configured', async () => {
    gate.enabled.mockResolvedValue(true)
    setEnv({ SEARXNG_URL: 'http://searxng:8080' })
    expect(await (await GET(request(), {})).json()).toEqual({
      codeInterpreter: true,
      webSearch: true,
    })
  })
})
