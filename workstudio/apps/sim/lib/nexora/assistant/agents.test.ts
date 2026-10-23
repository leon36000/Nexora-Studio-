/**
 * Failure modes owned here (which agents the Assistant offers):
 * - an agent of another workspace, a workflow outside the top-level `Agents` folder, an archived
 *   or undeployed workflow, or a chat that is inactive or archived is offered (the row mocks
 *   return whatever is queued, so the filter is pinned on the WHERE tree);
 * - a workflow with several chats is offered twice;
 * - the welcome message is not read from the chat's customizations;
 * - a workspace the caller has no access to is listed.
 */

import { createSessionPrincipal } from '@sim/testing/factories/principal.factory'
import {
  dbChainMockFns,
  hasMockCondition,
  queueTableRows,
  resetDbChainMock,
} from '@sim/testing/mocks/database.mock'
import { schemaMock } from '@sim/testing/mocks/schema.mock'
import { workspaceAuthzMock, workspaceAuthzMockFns } from '@sim/testing/mocks/workspace-authz.mock'
import { workspaceContextMock } from '@sim/testing/mocks/workspace-context.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@sim/platform-authz/workspace', () => workspaceAuthzMock)
vi.mock('@/lib/workspaces/application/context', () => workspaceContextMock)

import { AGENTS_FOLDER } from '@/lib/nexora/agents'
import { listAssistantAgents } from '@/lib/nexora/assistant'

const resolvePermission = workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission
const WORKSPACE_ID = 'workspace-1'
const member = createSessionPrincipal({ userId: 'member' })

beforeEach(() => {
  resetDbChainMock()
  resolvePermission.mockReset()
  resolvePermission.mockResolvedValue('read')
})

describe('listAssistantAgents', () => {
  it('refuses a workspace the caller has no access to', async () => {
    resolvePermission.mockResolvedValue(null)

    await expect(
      listAssistantAgents.execute({ principal: member, input: { workspaceId: WORKSPACE_ID } })
    ).rejects.toMatchObject({ code: 'forbidden' })
    expect(dbChainMockFns.select).not.toHaveBeenCalled()
  })

  it('offers only deployed agents of the workspace Agents folder with an active chat', async () => {
    queueTableRows(schemaMock.workflow, [])

    await listAssistantAgents.execute({ principal: member, input: { workspaceId: WORKSPACE_ID } })

    const where = dbChainMockFns.where.mock.calls.at(-1)?.[0]
    const has = (predicate: (node: Record<string, unknown>) => boolean) =>
      hasMockCondition(where, predicate)
    const eq = (column: unknown, value: unknown) => (node: Record<string, unknown>) =>
      node.type === 'eq' && node.left === column && node.right === value
    const isNull = (column: unknown) => (node: Record<string, unknown>) =>
      node.type === 'isNull' && node.column === column

    expect(has(eq(schemaMock.workflow.workspaceId, WORKSPACE_ID))).toBe(true)
    expect(has(isNull(schemaMock.workflow.archivedAt))).toBe(true)
    expect(has(eq(schemaMock.workflow.isDeployed, true))).toBe(true)
    expect(has(eq(schemaMock.folder.workspaceId, WORKSPACE_ID))).toBe(true)
    expect(has(eq(schemaMock.folder.name, AGENTS_FOLDER))).toBe(true)
    expect(has(eq(schemaMock.folder.resourceType, 'workflow'))).toBe(true)
    expect(has(isNull(schemaMock.folder.parentId))).toBe(true)
    expect(has(isNull(schemaMock.folder.deletedAt))).toBe(true)
    expect(has(eq(schemaMock.chat.isActive, true))).toBe(true)
    expect(has(isNull(schemaMock.chat.archivedAt))).toBe(true)
  })

  it('offers each agent once, with its chat welcome message', async () => {
    queueTableRows(schemaMock.workflow, [
      {
        workflowId: 'agent-1',
        name: 'Agent RH',
        description: null,
        chatIdentifier: 'agent-rh',
        customizations: { primaryColor: '#000', welcomeMessage: 'Bonjour, posez votre question.' },
      },
      {
        workflowId: 'agent-1',
        name: 'Agent RH',
        description: null,
        chatIdentifier: 'agent-rh-bis',
        customizations: {},
      },
      {
        workflowId: 'agent-2',
        name: 'Agent Ventes',
        description: 'Devis',
        chatIdentifier: 'agent-ventes',
        customizations: null,
      },
    ])

    const { agents } = await listAssistantAgents.execute({
      principal: member,
      input: { workspaceId: WORKSPACE_ID },
    })

    expect(agents).toEqual([
      {
        workflowId: 'agent-1',
        name: 'Agent RH',
        description: null,
        chatIdentifier: 'agent-rh',
        welcomeMessage: 'Bonjour, posez votre question.',
      },
      {
        workflowId: 'agent-2',
        name: 'Agent Ventes',
        description: 'Devis',
        chatIdentifier: 'agent-ventes',
        welcomeMessage: null,
      },
    ])
  })
})
