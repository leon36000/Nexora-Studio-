import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearTransfer,
  resolveTransferTarget,
  setTransfer,
  TRANSFER_TTL_SECONDS,
} from '@/lib/nexora/delegation/transfer'

const scope = { workspaceId: 'ws-1', workflowId: 'wf-assistant', conversationId: 'conv-1' }
const handoffs = [
  { agentId: 'wf-tarifs', mode: 'transfer' as const },
  { agentId: 'wf-sav', mode: 'reply' as const },
]

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-25T10:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
})

describe('conversation handed to another agent', () => {
  it('sends the conversation to the agent the main agent handed it to', async () => {
    await setTransfer(scope, 'wf-tarifs')
    expect(await resolveTransferTarget(scope, handoffs)).toEqual(handoffs[0])
  })

  it('keeps one conversation apart from another, another agent and another workspace', async () => {
    await setTransfer(scope, 'wf-tarifs')
    expect(await resolveTransferTarget({ ...scope, conversationId: 'conv-2' }, handoffs)).toBeNull()
    expect(await resolveTransferTarget({ ...scope, workflowId: 'wf-autre' }, handoffs)).toBeNull()
    expect(await resolveTransferTarget({ ...scope, workspaceId: 'ws-2' }, handoffs)).toBeNull()
  })

  it('gives the conversation back to the main agent after the retention period', async () => {
    await setTransfer({ ...scope, conversationId: 'conv-3' }, 'wf-tarifs')
    vi.setSystemTime(Date.now() + (TRANSFER_TTL_SECONDS - 5) * 1000)
    expect(
      await resolveTransferTarget({ ...scope, conversationId: 'conv-3' }, handoffs)
    ).not.toBeNull()
    vi.setSystemTime(Date.now() + 10 * 1000)
    expect(await resolveTransferTarget({ ...scope, conversationId: 'conv-3' }, handoffs)).toBeNull()
  })

  it('stops following an agent that is no longer in « Peut confier à »', async () => {
    await setTransfer({ ...scope, conversationId: 'conv-4' }, 'wf-tarifs')
    expect(
      await resolveTransferTarget({ ...scope, conversationId: 'conv-4' }, [handoffs[1]])
    ).toBeNull()
  })

  it('stops following an agent whose mode was changed back to « reply »', async () => {
    await setTransfer({ ...scope, conversationId: 'conv-5' }, 'wf-sav')
    expect(await resolveTransferTarget({ ...scope, conversationId: 'conv-5' }, handoffs)).toBeNull()
  })

  it('forgets a transfer that was cleared', async () => {
    await setTransfer({ ...scope, conversationId: 'conv-6' }, 'wf-tarifs')
    await clearTransfer({ ...scope, conversationId: 'conv-6' })
    expect(await resolveTransferTarget({ ...scope, conversationId: 'conv-6' }, handoffs)).toBeNull()
  })
})
