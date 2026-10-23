/**
 * Surface risks of the conversation collection: a workspace the caller has no access to must reach
 * the page as a 403 (not concealed: the member knows which workspace they asked for), and creating
 * a conversation with a workflow that is not a published agent as a 409 with the
 * `agent-unpublished` code.
 */
import { authMockFns } from '@sim/testing/mocks/auth.mock'
import { queueTableRows, resetDbChainMock } from '@sim/testing/mocks/database.mock'
import { rateLimiterMock } from '@sim/testing/mocks/rate-limiter.mock'
import { createMockRequest } from '@sim/testing/mocks/request.mock'
import { schemaMock } from '@sim/testing/mocks/schema.mock'
import { workspaceAuthzMock, workspaceAuthzMockFns } from '@sim/testing/mocks/workspace-authz.mock'
import { workspaceContextMock } from '@sim/testing/mocks/workspace-context.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@sim/platform-authz/workspace', () => workspaceAuthzMock)
vi.mock('@/lib/workspaces/application/context', () => workspaceContextMock)
vi.mock('@/lib/core/rate-limiter', () => rateLimiterMock)

import { GET, POST } from '@/app/api/nexora/assistant/conversations/route'

const resolvePermission = workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission
const CONVERSATIONS_URL = 'http://localhost/api/nexora/assistant/conversations'

beforeEach(() => {
  resetDbChainMock()
  resolvePermission.mockReset()
  resolvePermission.mockResolvedValue('read')
  authMockFns.mockGetSession.mockResolvedValue({
    user: { id: 'member' },
    session: { id: 'session-member' },
  })
})

describe('/api/nexora/assistant/conversations', () => {
  it('answers 403 for a workspace the caller has no access to', async () => {
    resolvePermission.mockResolvedValue(null)

    const response = await GET(
      createMockRequest({
        method: 'GET',
        url: CONVERSATIONS_URL,
        searchParams: { workspaceId: 'workspace-1' },
      })
    )

    expect(response.status).toBe(403)
  })

  it('answers 409 with the agent-unpublished code for a workflow that is not a published agent', async () => {
    queueTableRows(schemaMock.workflow, [])

    const response = await POST(
      createMockRequest({
        method: 'POST',
        url: CONVERSATIONS_URL,
        body: { workspaceId: 'workspace-1', workflowId: 'not-an-agent', firstMessage: 'Bonjour' },
      })
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'agent-unpublished' })
  })
})
