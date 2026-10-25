/**
 * @vitest-environment node
 */
import { permissionsMock, permissionsMockFns } from '@sim/testing/mocks/permissions.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  taskOwnerOf: vi.fn(),
}))

vi.mock('@/lib/nexora/acting-member', () => ({ taskOwnerOf: mocks.taskOwnerOf }))
vi.mock('@/lib/workspaces/permissions/utils', () => permissionsMock)

import { memberChatPayloadGate } from '@/lib/logs/member-chat'

const WS = 'workspace-1'
const memberChatRun = { trigger: { data: { memberChatUserId: 'alice' } } }
const plainRun = { trigger: { data: {} } }

describe('memberChatPayloadGate', () => {
  beforeEach(() => {
    mocks.taskOwnerOf.mockReset().mockResolvedValue(null)
    permissionsMockFns.mockGetUserEntityPermissions.mockReset().mockResolvedValue('write')
  })

  it('withholds a members-only chat from a colleague, not from its member or an admin', async () => {
    await expect(memberChatPayloadGate('bob', WS)(memberChatRun)).resolves.toBe(true)
    await expect(memberChatPayloadGate('alice', WS)(memberChatRun)).resolves.toBe(false)
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValue('admin')
    await expect(memberChatPayloadGate('bob', WS)(memberChatRun)).resolves.toBe(false)
  })

  it('withholds a run of a personal task from a colleague, not from its owner or an admin', async () => {
    mocks.taskOwnerOf.mockResolvedValue('alice')
    const run = { workflowId: 'wf-task' }
    await expect(memberChatPayloadGate('bob', WS)(plainRun, run)).resolves.toBe(true)
    await expect(memberChatPayloadGate('alice', WS)(plainRun, run)).resolves.toBe(false)
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValue('admin')
    await expect(memberChatPayloadGate('bob', WS)(plainRun, run)).resolves.toBe(false)
  })

  it('withholds a run of a personal task from a reader with no person to name', async () => {
    mocks.taskOwnerOf.mockResolvedValue('alice')
    await expect(
      memberChatPayloadGate(null, WS)(plainRun, { workflowId: 'wf-task' })
    ).resolves.toBe(true)
  })

  it('leaves a run of any other workflow readable, and asks for each workflow only once', async () => {
    const gate = memberChatPayloadGate('bob', WS)
    await expect(gate(plainRun, { workflowId: 'wf-other' })).resolves.toBe(false)
    await expect(gate(plainRun, { workflowId: 'wf-other' })).resolves.toBe(false)
    expect(mocks.taskOwnerOf).toHaveBeenCalledTimes(1)
    await expect(gate(plainRun)).resolves.toBe(false)
    await expect(gate(plainRun, { workflowId: null })).resolves.toBe(false)
  })
})
