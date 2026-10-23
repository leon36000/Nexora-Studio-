/**
 * Surface risks of workflow creation from a plan: a reader cannot create (403), a forged plan
 * outside the step language is a 400, a plan whose references do not resolve is a 422 with the
 * `plan-invalid` code and creates nothing, and a valid plan lands in the requested folder under
 * its title.
 */
import { auditMock } from '@sim/testing/mocks/audit.mock'
import { authMockFns } from '@sim/testing/mocks/auth.mock'
import { resetDbChainMock } from '@sim/testing/mocks/database.mock'
import { importWorkflowMock, importWorkflowMockFns } from '@sim/testing/mocks/import-workflow.mock'
import { rateLimiterMock } from '@sim/testing/mocks/rate-limiter.mock'
import { realtimeNotifyMock } from '@sim/testing/mocks/realtime-notify.mock'
import { createMockRequest } from '@sim/testing/mocks/request.mock'
import { workspaceAuthzMock, workspaceAuthzMockFns } from '@sim/testing/mocks/workspace-authz.mock'
import { workspaceContextMock } from '@sim/testing/mocks/workspace-context.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@sim/audit', () => auditMock)
vi.mock('@sim/platform-authz/workspace', () => workspaceAuthzMock)
vi.mock('@/lib/workspaces/application/context', () => workspaceContextMock)
vi.mock('@/lib/core/rate-limiter', () => rateLimiterMock)
vi.mock('@/lib/realtime/notify', () => realtimeNotifyMock)
vi.mock('@/lib/workflows/operations/import-workflow', () => importWorkflowMock)

import { parseWorkflowJson } from '@/lib/workflows/operations/import-export'
import { POST } from '@/app/api/nexora/copilot/create/route'

const resolvePermission = workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission
const importWorkflow = importWorkflowMockFns.mockImportWorkflowIntoWorkspaceTransition
const CREATE_URL = 'http://localhost/api/nexora/copilot/create'

const plan = {
  title: 'Réponse aux clients',
  trigger: { kind: 'chat' },
  steps: [
    {
      kind: 'agent',
      name: 'reponse',
      instructions: 'Vous répondez aux clients.',
      message: 'Question : {{declencheur.input}}',
    },
  ],
}

function createRequest(body: unknown) {
  return createMockRequest({ method: 'POST', url: CREATE_URL, body })
}

beforeEach(() => {
  resetDbChainMock()
  resolvePermission.mockReset()
  resolvePermission.mockResolvedValue('write')
  importWorkflow.mockReset()
  importWorkflow.mockResolvedValue({
    success: true,
    warnings: [],
    workflow: {
      id: 'workflow-new',
      name: plan.title,
      description: null,
      workspaceId: 'workspace-1',
      folderId: 'folder-1',
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      blocks: [],
    },
  })
  authMockFns.mockGetSession.mockResolvedValue({
    user: { id: 'member' },
    session: { id: 'session-member' },
  })
})

describe('POST /api/nexora/copilot/create', () => {
  it('answers 403 to a reader and creates nothing', async () => {
    resolvePermission.mockResolvedValue('read')

    const response = await POST(createRequest({ workspaceId: 'workspace-1', plan }))

    expect(response.status).toBe(403)
    expect(importWorkflow).not.toHaveBeenCalled()
  })

  it('answers 400 to a plan of more than 12 steps', async () => {
    const steps = Array.from({ length: 50 }, (_, index) => ({
      kind: 'attente',
      name: `pause_${index}`,
      seconds: 1,
    }))

    const response = await POST(
      createRequest({ workspaceId: 'workspace-1', plan: { ...plan, steps } })
    )

    expect(response.status).toBe(400)
    expect(importWorkflow).not.toHaveBeenCalled()
  })

  it('answers 422 with the plan-invalid code to an unknown reference and creates nothing', async () => {
    const broken = {
      ...plan,
      steps: [{ ...plan.steps[0], message: 'Question : {{etape_inconnue.content}}' }],
    }

    const response = await POST(createRequest({ workspaceId: 'workspace-1', plan: broken }))

    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body.code).toBe('plan-invalid')
    expect(body.error).toContain('etape_inconnue')
    expect(importWorkflow).not.toHaveBeenCalled()
  })

  it('imports the compiled workflow into the requested folder under the plan title', async () => {
    const response = await POST(
      createRequest({ workspaceId: 'workspace-1', plan, folderId: 'folder-1' })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ workflowId: 'workflow-new', warnings: [] })
    const [params] = importWorkflow.mock.calls[0]
    expect(params).toMatchObject({
      workspaceId: 'workspace-1',
      folderId: 'folder-1',
      name: 'Réponse aux clients',
      userId: 'member',
    })
    expect(parseWorkflowJson(params.workflow).errors).toEqual([])
  })

  it('answers 404 when the folder is not in the workspace', async () => {
    importWorkflow.mockResolvedValue({ success: false, status: 404, error: 'Folder not found' })

    const response = await POST(
      createRequest({ workspaceId: 'workspace-1', plan, folderId: 'folder-elsewhere' })
    )

    expect(response.status).toBe(404)
  })
})
