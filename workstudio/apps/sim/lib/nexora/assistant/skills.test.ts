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

import { listAssistantSkills } from '@/lib/nexora/assistant/skills'

const member = createSessionPrincipal({ userId: 'member', sessionId: 'session-member' })

beforeEach(() => {
  resetDbChainMock()
  workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission.mockResolvedValue('read')
})

describe('listAssistantSkills', () => {
  it('lists the workspace’s skills by name and description, never their content', async () => {
    queueTableRows(schemaMock.skill, [
      { name: 'redaction-devis', description: 'Rédiger un devis', content: 'secret interne' },
    ])
    const { skills } = await listAssistantSkills.execute({
      principal: member,
      input: { workspaceId: 'workspace-1' },
    })
    expect(skills).toEqual([{ name: 'redaction-devis', description: 'Rédiger un devis' }])
    expect(JSON.stringify(skills)).not.toContain('secret interne')
    expect(
      dbChainMockFns.where.mock.calls.some(([condition]) =>
        hasMockCondition(
          condition,
          (node) =>
            node.type === 'eq' &&
            node.left === schemaMock.skill.workspaceId &&
            node.right === 'workspace-1'
        )
      )
    ).toBe(true)
  })

  it('refuses a workspace the caller cannot reach', async () => {
    workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission.mockResolvedValue(null)
    await expect(
      listAssistantSkills.execute({ principal: member, input: { workspaceId: 'workspace-1' } })
    ).rejects.toMatchObject({ code: 'forbidden' })
    expect(dbChainMockFns.select).not.toHaveBeenCalled()
  })
})
