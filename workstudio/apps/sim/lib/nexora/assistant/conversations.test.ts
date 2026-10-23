/**
 * Failure modes owned here (the Assistant's private-conversation boundary):
 * - another member's conversation id is answered as not found, before the workspace is
 *   authorized and before anything is read, written or deleted;
 * - a workspace the caller has no access to is refused as forbidden;
 * - a principal the operations do not name (a workspace API key) is refused before any load;
 * - a conversation is created only for a published agent of the same workspace;
 * - the title is derived from the first message, at most 60 characters, cut on a word;
 * - a conversation whose agent was deleted or unpublished stays readable, while appending to
 *   it is refused with the `agent-unpublished` code;
 * - appending bumps the conversation's `updatedAt`, and a conversation deleted meanwhile is
 *   answered as not found rather than a foreign-key failure.
 */

import {
  createSessionPrincipal,
  createWorkspaceApiKeyPrincipal,
} from '@sim/testing/factories/principal.factory'
import {
  dbChainMockFns,
  hasMockCondition,
  queueTableRows,
  resetDbChainMock,
} from '@sim/testing/mocks/database.mock'
import { schemaMock } from '@sim/testing/mocks/schema.mock'
import { workspaceAuthzMock, workspaceAuthzMockFns } from '@sim/testing/mocks/workspace-authz.mock'
import {
  workspaceContextMock,
  workspaceContextMockFns,
} from '@sim/testing/mocks/workspace-context.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@sim/platform-authz/workspace', () => workspaceAuthzMock)
vi.mock('@/lib/workspaces/application/context', () => workspaceContextMock)

import { ASSISTANT_AGENT_UNPUBLISHED_CODE } from '@/lib/api/contracts/nexora-assistant'
import { OrchestrationError } from '@/lib/core/orchestration/types'
import {
  AssistantAgentUnpublishedError,
  appendAssistantMessage,
  createAssistantConversation,
  deleteAssistantConversation,
  getAssistantConversation,
  listAssistantConversations,
  renameAssistantConversation,
} from '@/lib/nexora/assistant'

const mocks = {
  permission: workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission,
  workspace: workspaceContextMockFns.mockLoadWorkspaceApplicationContext,
}

const WORKSPACE_ID = 'workspace-1'
const owner = createSessionPrincipal({ userId: 'owner', sessionId: 'session-owner' })
const colleague = createSessionPrincipal({ userId: 'colleague', sessionId: 'session-colleague' })

const conversationRow = {
  id: 'conversation-1',
  workspaceId: WORKSPACE_ID,
  userId: 'owner',
  workflowId: 'agent-1',
  title: 'Bonjour',
  createdAt: new Date('2026-10-01T10:00:00.000Z'),
  updatedAt: new Date('2026-10-01T10:05:00.000Z'),
}

const publishedAgentRow = {
  workflowId: 'agent-1',
  name: 'Agent RH',
  description: 'Répond aux questions RH',
  chatIdentifier: 'agent-rh',
  customizations: { welcomeMessage: 'Bonjour !' },
}

function lastWhereCondition(): unknown {
  return dbChainMockFns.where.mock.calls.at(-1)?.[0]
}

function anyWhereCondition(predicate: (node: Record<string, unknown>) => boolean): boolean {
  return dbChainMockFns.where.mock.calls.some(([condition]) =>
    hasMockCondition(condition, predicate)
  )
}

beforeEach(() => {
  resetDbChainMock()
  mocks.permission.mockReset()
  mocks.permission.mockResolvedValue('read')
})

describe('conversation ownership', () => {
  it.each([
    [
      'read',
      () =>
        getAssistantConversation.execute({
          principal: colleague,
          input: { conversationId: 'conversation-1' },
        }),
    ],
    [
      'rename',
      () =>
        renameAssistantConversation.execute({
          principal: colleague,
          input: { conversationId: 'conversation-1', title: 'Volé' },
        }),
    ],
    [
      'delete',
      () =>
        deleteAssistantConversation.execute({
          principal: colleague,
          input: { conversationId: 'conversation-1' },
        }),
    ],
    [
      'append',
      () =>
        appendAssistantMessage.execute({
          principal: colleague,
          input: { conversationId: 'conversation-1', role: 'user', content: 'Salut' },
        }),
    ],
  ])('answers another member %s as not found and touches nothing', async (_name, run) => {
    queueTableRows(schemaMock.nexoraAssistantConversation, [conversationRow])

    const error = await run().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(OrchestrationError)
    expect((error as OrchestrationError).code).toBe('not_found')
    expect(mocks.permission).not.toHaveBeenCalled()
    expect(dbChainMockFns.update).not.toHaveBeenCalled()
    expect(dbChainMockFns.delete).not.toHaveBeenCalled()
    expect(dbChainMockFns.insert).not.toHaveBeenCalled()
  })

  it('answers an unknown conversation as not found', async () => {
    await expect(
      getAssistantConversation.execute({
        principal: owner,
        input: { conversationId: 'missing' },
      })
    ).rejects.toMatchObject({ code: 'not_found' })
  })

  it('refuses the owner once they lost access to the workspace', async () => {
    queueTableRows(schemaMock.nexoraAssistantConversation, [conversationRow])
    mocks.permission.mockResolvedValue(null)

    await expect(
      getAssistantConversation.execute({
        principal: owner,
        input: { conversationId: 'conversation-1' },
      })
    ).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('refuses a workspace API key before loading anything', async () => {
    await expect(
      listAssistantConversations.execute({
        principal: createWorkspaceApiKeyPrincipal({ workspaceId: WORKSPACE_ID }),
        input: { workspaceId: WORKSPACE_ID },
      })
    ).rejects.toMatchObject({ code: 'forbidden' })
    expect(mocks.workspace).not.toHaveBeenCalled()
    expect(dbChainMockFns.select).not.toHaveBeenCalled()
  })
})

describe('listAssistantConversations', () => {
  it('refuses a workspace the caller has no access to', async () => {
    mocks.permission.mockResolvedValue(null)

    await expect(
      listAssistantConversations.execute({ principal: owner, input: { workspaceId: WORKSPACE_ID } })
    ).rejects.toMatchObject({ code: 'forbidden' })
    expect(dbChainMockFns.select).not.toHaveBeenCalled()
  })

  it('lists only the caller’s own conversations of the workspace, newest first, at most 50', async () => {
    queueTableRows(schemaMock.nexoraAssistantConversation, [conversationRow])

    const result = await listAssistantConversations.execute({
      principal: owner,
      input: { workspaceId: WORKSPACE_ID },
    })

    expect(result.conversations).toEqual([conversationRow])
    const where = lastWhereCondition()
    expect(
      hasMockCondition(
        where,
        (node) =>
          node.type === 'eq' &&
          node.left === schemaMock.nexoraAssistantConversation.userId &&
          node.right === 'owner'
      )
    ).toBe(true)
    expect(
      hasMockCondition(
        where,
        (node) =>
          node.type === 'eq' &&
          node.left === schemaMock.nexoraAssistantConversation.workspaceId &&
          node.right === WORKSPACE_ID
      )
    ).toBe(true)
    expect(dbChainMockFns.orderBy).toHaveBeenCalledWith({
      type: 'desc',
      column: schemaMock.nexoraAssistantConversation.updatedAt,
    })
    expect(dbChainMockFns.limit).toHaveBeenCalledWith(50)
  })
})

describe('createAssistantConversation', () => {
  function create(firstMessage: string, workflowId = 'agent-1') {
    return createAssistantConversation.execute({
      principal: owner,
      input: { workspaceId: WORKSPACE_ID, workflowId, firstMessage },
    })
  }

  it('refuses a workflow that is not a published agent of the workspace', async () => {
    queueTableRows(schemaMock.workflow, [])

    const error = await create('Bonjour').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(AssistantAgentUnpublishedError)
    expect((error as AssistantAgentUnpublishedError).reason).toBe(ASSISTANT_AGENT_UNPUBLISHED_CODE)
    expect(dbChainMockFns.insert).not.toHaveBeenCalled()
    expect(
      anyWhereCondition(
        (node) =>
          node.type === 'eq' &&
          node.left === schemaMock.workflow.workspaceId &&
          node.right === WORKSPACE_ID
      )
    ).toBe(true)
  })

  it('refuses a workspace the caller has no access to before looking up the agent', async () => {
    mocks.permission.mockResolvedValue(null)

    await expect(create('Bonjour')).rejects.toMatchObject({ code: 'forbidden' })
    expect(dbChainMockFns.select).not.toHaveBeenCalled()
  })

  it.each([
    ['keeps a short first message', '  Bonjour   le monde  ', 'Bonjour le monde'],
    [
      'cuts a long first message on a word and marks the cut',
      'Pouvez-vous me résumer la convention collective applicable à notre entreprise de transport ?',
      'Pouvez-vous me résumer la convention collective applicable…',
    ],
    ['cuts a single over-long word', 'a'.repeat(80), `${'a'.repeat(59)}…`],
  ])('%s as the title', async (_name, firstMessage, expectedTitle) => {
    queueTableRows(schemaMock.workflow, [publishedAgentRow])
    dbChainMockFns.returning.mockImplementationOnce(async () => [
      { ...conversationRow, title: expectedTitle },
    ])

    await create(firstMessage)

    const inserted = dbChainMockFns.values.mock.calls[0]?.[0] as { title: string; userId: string }
    expect(inserted.title).toBe(expectedTitle)
    expect(inserted.title.length).toBeLessThanOrEqual(60)
    expect(inserted.userId).toBe('owner')
  })
})

describe('getAssistantConversation', () => {
  it('keeps a conversation readable after its agent was deleted', async () => {
    queueTableRows(schemaMock.nexoraAssistantConversation, [
      { ...conversationRow, workflowId: null },
    ])
    queueTableRows(schemaMock.nexoraAssistantMessage, [
      {
        id: 'message-1',
        conversationId: 'conversation-1',
        role: 'user',
        content: 'Bonjour',
        files: null,
        usage: null,
        interrupted: false,
        createdAt: new Date('2026-10-01T10:00:00.000Z'),
      },
    ])

    const result = await getAssistantConversation.execute({
      principal: owner,
      input: { conversationId: 'conversation-1' },
    })

    expect(result.agent).toBeNull()
    expect(result.conversation.workflowId).toBeNull()
    expect(result.messages.map((message) => message.content)).toEqual(['Bonjour'])
  })

  it('returns the published agent the page sends messages to', async () => {
    queueTableRows(schemaMock.nexoraAssistantConversation, [conversationRow])
    queueTableRows(schemaMock.workflow, [publishedAgentRow])

    const result = await getAssistantConversation.execute({
      principal: owner,
      input: { conversationId: 'conversation-1' },
    })

    expect(result.agent).toEqual({
      workflowId: 'agent-1',
      name: 'Agent RH',
      description: 'Répond aux questions RH',
      chatIdentifier: 'agent-rh',
      welcomeMessage: 'Bonjour !',
    })
  })
})

describe('deleteAssistantConversation', () => {
  it("deletes the agent's memory of the conversation with it, in the conversation's workspace", async () => {
    queueTableRows(schemaMock.nexoraAssistantConversation, [conversationRow])
    dbChainMockFns.returning.mockImplementationOnce(async () => [{ id: 'conversation-1' }])

    await deleteAssistantConversation.execute({
      principal: owner,
      input: { conversationId: 'conversation-1' },
    })

    expect(dbChainMockFns.delete).toHaveBeenCalledWith(schemaMock.memory)
    expect(
      anyWhereCondition(
        (node) =>
          node.type === 'inArray' &&
          node.column === schemaMock.memory.key &&
          Array.isArray(node.values) &&
          node.values.includes('owner:conversation-1') &&
          node.values.includes('conversation-1')
      )
    ).toBe(true)
    expect(
      anyWhereCondition(
        (node) =>
          node.type === 'eq' &&
          node.left === schemaMock.memory.workspaceId &&
          node.right === WORKSPACE_ID
      )
    ).toBe(true)
  })
})

describe('appendAssistantMessage', () => {
  function append(overrides: Record<string, unknown> = {}) {
    return appendAssistantMessage.execute({
      principal: owner,
      input: {
        conversationId: 'conversation-1',
        role: 'user',
        content: 'Question',
        ...overrides,
      },
    })
  }

  it.each([
    ['its agent was deleted', { ...conversationRow, workflowId: null }, []],
    ['its agent is no longer published', conversationRow, []],
  ])('refuses with agent-unpublished when %s', async (_name, conversation, agents) => {
    queueTableRows(schemaMock.nexoraAssistantConversation, [conversation])
    queueTableRows(schemaMock.workflow, agents)

    const error = await append().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(AssistantAgentUnpublishedError)
    expect(dbChainMockFns.insert).not.toHaveBeenCalled()
    expect(dbChainMockFns.update).not.toHaveBeenCalled()
  })

  it('keeps an answer already produced when its agent is unpublished during the stream', async () => {
    queueTableRows(schemaMock.nexoraAssistantConversation, [
      { ...conversationRow, workflowId: null },
    ])
    dbChainMockFns.returning
      .mockImplementationOnce(async () => [{ id: 'conversation-1' }])
      .mockImplementationOnce(async () => [
        {
          id: 'message-3',
          conversationId: 'conversation-1',
          role: 'assistant',
          content: 'Réponse',
          files: null,
          usage: null,
          interrupted: false,
          createdAt: new Date('2026-10-01T10:07:00.000Z'),
        },
      ])
    await expect(append({ role: 'assistant', content: 'Réponse' })).resolves.toBeDefined()
    expect(dbChainMockFns.insert).toHaveBeenCalled()
  })

  it('stores the message and bumps the conversation', async () => {
    queueTableRows(schemaMock.nexoraAssistantConversation, [conversationRow])
    queueTableRows(schemaMock.workflow, [publishedAgentRow])
    dbChainMockFns.returning
      .mockImplementationOnce(async () => [{ id: 'conversation-1' }])
      .mockImplementationOnce(async () => [
        {
          id: 'message-2',
          conversationId: 'conversation-1',
          role: 'assistant',
          content: 'Réponse partielle',
          files: null,
          usage: { promptTokens: 10, completionTokens: 3 },
          interrupted: true,
          createdAt: new Date('2026-10-01T10:06:00.000Z'),
        },
      ])

    const result = await append({
      role: 'assistant',
      content: 'Réponse partielle',
      usage: { promptTokens: 10, completionTokens: 3 },
      interrupted: true,
    })

    expect(result.message.interrupted).toBe(true)
    const bump = dbChainMockFns.set.mock.calls[0]?.[0] as { updatedAt?: unknown }
    expect(bump.updatedAt).toBeInstanceOf(Date)
    const inserted = dbChainMockFns.values.mock.calls[0]?.[0] as Record<string, unknown>
    expect(inserted).toMatchObject({
      conversationId: 'conversation-1',
      role: 'assistant',
      content: 'Réponse partielle',
      usage: { promptTokens: 10, completionTokens: 3 },
      interrupted: true,
    })
  })

  it('answers a conversation deleted meanwhile as not found without inserting', async () => {
    queueTableRows(schemaMock.nexoraAssistantConversation, [conversationRow])
    queueTableRows(schemaMock.workflow, [publishedAgentRow])
    dbChainMockFns.returning.mockImplementationOnce(async () => [])

    await expect(append()).rejects.toMatchObject({ code: 'not_found' })
    expect(dbChainMockFns.insert).not.toHaveBeenCalled()
  })
})
