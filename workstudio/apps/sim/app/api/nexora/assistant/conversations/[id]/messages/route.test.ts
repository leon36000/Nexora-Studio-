/**
 * Surface risks of appending a message: an unpublished agent must reach the page as a 409 carrying
 * the `agent-unpublished` code it branches on, another member's conversation as a bare 404, a
 * missing session as a 401, and a stored message as a 201 whose dates are wire strings.
 */
import { createRouteContext } from '@sim/testing/helpers/http'
import { authMockFns } from '@sim/testing/mocks/auth.mock'
import { dbChainMockFns, queueTableRows, resetDbChainMock } from '@sim/testing/mocks/database.mock'
import { rateLimiterMock } from '@sim/testing/mocks/rate-limiter.mock'
import { createMockRequest } from '@sim/testing/mocks/request.mock'
import { schemaMock } from '@sim/testing/mocks/schema.mock'
import { workspaceAuthzMock, workspaceAuthzMockFns } from '@sim/testing/mocks/workspace-authz.mock'
import { workspaceContextMock } from '@sim/testing/mocks/workspace-context.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@sim/platform-authz/workspace', () => workspaceAuthzMock)
vi.mock('@/lib/workspaces/application/context', () => workspaceContextMock)
vi.mock('@/lib/core/rate-limiter', () => rateLimiterMock)

import { POST } from '@/app/api/nexora/assistant/conversations/[id]/messages/route'

const resolvePermission = workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission
const context = createRouteContext({ id: 'conversation-1' })

const conversationRow = {
  id: 'conversation-1',
  workspaceId: 'workspace-1',
  userId: 'owner',
  workflowId: 'agent-1',
  title: 'Bonjour',
  createdAt: new Date('2026-10-01T10:00:00.000Z'),
  updatedAt: new Date('2026-10-01T10:05:00.000Z'),
}

function append(body: unknown = { role: 'user', content: 'Bonjour' }) {
  return POST(
    createMockRequest({
      method: 'POST',
      url: 'http://localhost/api/nexora/assistant/conversations/conversation-1/messages',
      body,
    }),
    context
  )
}

beforeEach(() => {
  resetDbChainMock()
  resolvePermission.mockReset()
  resolvePermission.mockResolvedValue('read')
  authMockFns.mockGetSession.mockResolvedValue({
    user: { id: 'owner' },
    session: { id: 'session-owner' },
  })
})

describe('POST /api/nexora/assistant/conversations/[id]/messages', () => {
  it('answers 401 without a session', async () => {
    authMockFns.mockGetSession.mockResolvedValue(null)

    expect((await append()).status).toBe(401)
  })

  it('answers 409 with the agent-unpublished code once the agent was deleted', async () => {
    queueTableRows(schemaMock.nexoraAssistantConversation, [
      { ...conversationRow, workflowId: null },
    ])

    const response = await append()

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'agent-unpublished' })
  })

  it('answers 404 for another member’s conversation', async () => {
    queueTableRows(schemaMock.nexoraAssistantConversation, [
      { ...conversationRow, userId: 'colleague' },
    ])

    const response = await append()

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ error: 'Conversation not found' })
  })

  it('answers 201 with the stored message', async () => {
    queueTableRows(schemaMock.nexoraAssistantConversation, [conversationRow])
    queueTableRows(schemaMock.workflow, [
      {
        workflowId: 'agent-1',
        name: 'Agent RH',
        description: null,
        chatIdentifier: 'agent-rh',
        customizations: {},
      },
    ])
    dbChainMockFns.returning
      .mockImplementationOnce(async () => [{ id: 'conversation-1' }])
      .mockImplementationOnce(async () => [
        {
          id: 'message-1',
          conversationId: 'conversation-1',
          role: 'user',
          content: 'Bonjour',
          files: null,
          usage: null,
          interrupted: false,
          createdAt: new Date('2026-10-01T10:06:00.000Z'),
        },
      ])

    const response = await append()

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      message: {
        id: 'message-1',
        conversationId: 'conversation-1',
        role: 'user',
        content: 'Bonjour',
        files: [],
        usage: null,
        interrupted: false,
        createdAt: '2026-10-01T10:06:00.000Z',
      },
    })
  })

  it('stores only the name, type and size of an attached file, never a storage key sent by the page', async () => {
    queueTableRows(schemaMock.nexoraAssistantConversation, [conversationRow])
    queueTableRows(schemaMock.workflow, [
      {
        workflowId: 'agent-1',
        name: 'Agent RH',
        description: null,
        chatIdentifier: 'agent-rh',
        customizations: {},
      },
    ])
    const legacyFile = {
      name: 'ancien.pdf',
      key: 'workspace/workspace-1/ancien.pdf',
      type: 'application/pdf',
      size: 10,
    }
    dbChainMockFns.returning
      .mockImplementationOnce(async () => [{ id: 'conversation-1' }])
      .mockImplementationOnce(async () => [
        {
          id: 'message-1',
          conversationId: 'conversation-1',
          role: 'user',
          content: 'Voici le contrat',
          files: [legacyFile],
          usage: null,
          interrupted: false,
          createdAt: new Date('2026-10-01T10:06:00.000Z'),
        },
      ])

    const response = await append({
      role: 'user',
      content: 'Voici le contrat',
      files: [
        {
          name: 'contrat.pdf',
          key: 'workspace/workspace-2/secret.pdf',
          type: 'application/pdf',
          size: 1200,
        },
      ],
    })

    expect(response.status).toBe(201)
    const inserted = dbChainMockFns.values.mock.calls.at(-1)?.[0] as { files?: unknown }
    expect(inserted.files).toEqual([{ name: 'contrat.pdf', type: 'application/pdf', size: 1200 }])
    const { message } = await response.json()
    expect(message.files).toEqual([{ name: 'ancien.pdf', type: 'application/pdf', size: 10 }])
  })
})
