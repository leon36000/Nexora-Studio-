import {
  nexoraAdminAccessMock,
  nexoraAdminAccessMockFns,
} from '@sim/testing/mocks/nexora-admin-access.mock'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = vi.hoisted(() => ({
  read: vi.fn(),
  update: vi.fn(),
  configured: vi.fn(),
  health: vi.fn(),
}))

vi.mock('@/lib/nexora/admin-access', () => nexoraAdminAccessMock)
vi.mock('@/lib/nexora/code-execution', () => ({
  readCodeExecutionSetting: store.read,
  updateCodeExecutionSetting: store.update,
}))
vi.mock('@/lib/execution/remote-sandbox/nexora', () => ({
  isCodeSandboxConfigured: store.configured,
  checkCodeSandboxHealth: store.health,
}))

import { GET, PUT } from '@/app/api/nexora/code-execution/route'

const authorize = nexoraAdminAccessMockFns.mockAuthorizeInstanceAdmin

function request(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/nexora/code-execution', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('Nexora code execution setting', () => {
  beforeEach(() => {
    authorize.mockResolvedValue({
      ok: true,
      userId: 'u-admin',
      organizationId: 'org-1',
      role: 'admin',
    })
    store.read.mockResolvedValue({ enabled: false })
    store.configured.mockReturnValue(true)
    store.health.mockResolvedValue({ reachable: true, limits: { memoryMb: 1024 } })
    store.update.mockImplementation(async (enabled: boolean) => ({ enabled }))
  })

  it('refuses everyone but instance administrators, and changes nothing', async () => {
    authorize.mockResolvedValue({ ok: false, status: 403 })
    expect((await GET(request('GET'), {})).status).toBe(403)
    expect((await PUT(request('PUT', { enabled: true }), {})).status).toBe(403)
    expect(store.update).not.toHaveBeenCalled()
    expect(authorize.mock.calls[0][0]).toEqual({ requireInstanceOrganization: true })
  })

  it('is off until an administrator turns it on, and says whether the service is installed', async () => {
    const body = await (await GET(request('GET'), {})).json()
    expect(body).toMatchObject({ configured: true, enabled: false, reachable: true })
    store.configured.mockReturnValue(false)
    expect(await (await GET(request('GET'), {})).json()).toMatchObject({
      configured: false,
      enabled: false,
      reachable: false,
    })
  })

  it('refuses to turn it on when the sandbox service is not installed', async () => {
    store.configured.mockReturnValue(false)
    const response = await PUT(request('PUT', { enabled: true }), {})
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: 'not-installed' })
    expect(store.update).not.toHaveBeenCalled()
  })

  it('turns it on and off, recording who did it', async () => {
    const on = await PUT(request('PUT', { enabled: true }), {})
    expect(on.status).toBe(200)
    expect((await on.json()).enabled).toBe(true)
    expect(store.update).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ userId: 'u-admin', organizationId: 'org-1' })
    )
    store.configured.mockReturnValue(false)
    const off = await PUT(request('PUT', { enabled: false }), {})
    expect(off.status).toBe(200)
  })

  it('rejects a body that is not a boolean switch', async () => {
    expect((await PUT(request('PUT', { enabled: 'oui' }), {})).status).toBe(400)
  })
})
