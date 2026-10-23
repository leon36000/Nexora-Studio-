import {
  nexoraAdminAccessMock,
  nexoraAdminAccessMockFns,
} from '@sim/testing/mocks/nexora-admin-access.mock'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const fns = vi.hoisted(() => ({
  defaultModel: vi.fn(),
  read: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/lib/nexora/admin-access', () => nexoraAdminAccessMock)
vi.mock('@/lib/nexora/default-model', () => ({ fetchDefaultModelName: fns.defaultModel }))
vi.mock('@/lib/nexora/onboarding', () => ({
  readOnboarding: fns.read,
  updateOnboarding: fns.update,
}))

import { GET } from '@/app/api/nexora/home/route'
import { PATCH } from '@/app/api/nexora/onboarding/route'

const authorize = nexoraAdminAccessMockFns.mockAuthorizeInstanceAdmin

const progress = { completed: ['model'], dismissed: false }

function patch(body: unknown) {
  return new NextRequest('http://localhost/api/nexora/onboarding', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Nexora home routes', () => {
  beforeEach(() => {
    authorize.mockResolvedValue({ ok: true, userId: 'u-1', organizationId: 'org-1' })
    fns.defaultModel.mockResolvedValue('qwen2.5:7b')
    fns.read.mockResolvedValue(progress)
    fns.update.mockResolvedValue(progress)
  })

  it('requires a session', async () => {
    authorize.mockResolvedValue({ ok: false, status: 401 })
    expect((await GET(new NextRequest('http://localhost/api/nexora/home'), {})).status).toBe(401)
  })

  it('shows the default model to a plain member, without the first launch', async () => {
    authorize.mockResolvedValue({ ok: false, status: 403 })
    const response = await GET(new NextRequest('http://localhost/api/nexora/home'), {})
    expect(await response.json()).toEqual({
      defaultModel: 'qwen2.5:7b',
      isInstanceAdmin: false,
      onboarding: null,
    })
    expect(fns.read).not.toHaveBeenCalled()
  })

  it('gives an admin the first-launch progress of their organization', async () => {
    const body = await (await GET(new NextRequest('http://localhost/api/nexora/home'), {})).json()
    expect(body).toEqual({
      defaultModel: 'qwen2.5:7b',
      isInstanceAdmin: true,
      onboarding: progress,
    })
    expect(fns.read).toHaveBeenCalledWith('org-1')
  })

  it('lets only an admin record progress, and only known steps', async () => {
    authorize.mockResolvedValueOnce({ ok: false, status: 403 })
    expect((await PATCH(patch({ complete: 'model' }), {})).status).toBe(403)
    expect((await PATCH(patch({ complete: 'hack' }), {})).status).toBe(400)
    expect((await PATCH(patch({}), {})).status).toBe(400)
    expect(fns.update).not.toHaveBeenCalled()
    const ok = await PATCH(patch({ complete: 'model' }), {})
    expect(await ok.json()).toEqual({ onboarding: progress })
    expect(fns.update).toHaveBeenCalledWith('org-1', { complete: 'model' })
  })
})
