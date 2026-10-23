/**
 * Surface risks of plan generation: a reader must not spend the model (403 before any call), a
 * malformed request is a 400, and the page branches on the `plan-invalid` (422) and `unavailable`
 * (503) codes.
 */
import { authMockFns } from '@sim/testing/mocks/auth.mock'
import { resetDbChainMock } from '@sim/testing/mocks/database.mock'
import { setEnv } from '@sim/testing/mocks/env.mock'
import { setEnvFlags } from '@sim/testing/mocks/env-flags.mock'
import { rateLimiterMock } from '@sim/testing/mocks/rate-limiter.mock'
import { createMockRequest } from '@sim/testing/mocks/request.mock'
import { workspaceAuthzMock, workspaceAuthzMockFns } from '@sim/testing/mocks/workspace-authz.mock'
import { workspaceContextMock } from '@sim/testing/mocks/workspace-context.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@sim/platform-authz/workspace', () => workspaceAuthzMock)
vi.mock('@/lib/workspaces/application/context', () => workspaceContextMock)
vi.mock('@/lib/core/rate-limiter', () => rateLimiterMock)

import { POST } from '@/app/api/nexora/copilot/plan/route'

const resolvePermission = workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission
const PLAN_URL = 'http://localhost/api/nexora/copilot/plan'

const validPlan = {
  title: 'Relance des factures',
  trigger: { kind: 'planification', frequency: 'semaine', weekday: 'lundi', time: '09:00' },
  steps: [
    {
      kind: 'agent',
      name: 'relance',
      instructions: 'Vous rédigez les relances.',
      message: 'Relancez les factures impayées.',
    },
  ],
}

const fetchMock = vi.fn()

function modelAnswer(content: string): Response {
  return Response.json({ choices: [{ message: { content } }] })
}

function planRequest(body: unknown) {
  return createMockRequest({ method: 'POST', url: PLAN_URL, body })
}

beforeEach(() => {
  resetDbChainMock()
  resolvePermission.mockReset()
  resolvePermission.mockResolvedValue('write')
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  setEnvFlags({ isNexoraOnlyModels: true })
  setEnv({ VLLM_BASE_URL: 'http://nexora-api:8000/v1' })
  authMockFns.mockGetSession.mockResolvedValue({
    user: { id: 'member' },
    session: { id: 'session-member' },
  })
})

describe('POST /api/nexora/copilot/plan', () => {
  it('answers 403 to a reader without calling the model', async () => {
    resolvePermission.mockResolvedValue('read')

    const response = await POST(
      planRequest({ workspaceId: 'workspace-1', description: 'Relancer les factures' })
    )

    expect(response.status).toBe(403)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('answers 400 to an empty or overlong description', async () => {
    const empty = await POST(planRequest({ workspaceId: 'workspace-1', description: '   ' }))
    const overlong = await POST(
      planRequest({ workspaceId: 'workspace-1', description: 'x'.repeat(4001) })
    )

    expect([empty.status, overlong.status]).toEqual([400, 400])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('answers 422 with the plan-invalid code when the plan stays invalid after the retry', async () => {
    fetchMock.mockImplementation(async () => modelAnswer('Je ne peux pas.'))

    const response = await POST(
      planRequest({ workspaceId: 'workspace-1', description: 'Relancer les factures' })
    )

    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ code: 'plan-invalid' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('answers 503 with the unavailable code when the model cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    const response = await POST(
      planRequest({ workspaceId: 'workspace-1', description: 'Relancer les factures' })
    )

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ code: 'unavailable' })
  })

  it('returns the validated plan with its French summary', async () => {
    fetchMock.mockImplementation(async () => modelAnswer(JSON.stringify(validPlan)))

    const response = await POST(
      planRequest({ workspaceId: 'workspace-1', description: 'Relancer les factures' })
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.plan.title).toBe('Relance des factures')
    expect(body.summary[0]).toContain('Chaque lundi à 9 h')
  })
})
