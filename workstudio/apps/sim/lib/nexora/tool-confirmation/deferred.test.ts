import { describe, expect, it, vi } from 'vitest'
import {
  APPROVAL_FIELD,
  approvalGranted,
  type DeferredAgentAction,
  pendingActionsView,
  settleDeferredActions,
} from '@/lib/nexora/tool-confirmation/deferred'

const email: DeferredAgentAction = {
  toolId: 'mcp-srv-execute_action',
  title: 'postmark.send_email',
  summary: '{"to":"client@pme.fr"}',
  params: { actionId: 'postmark.send_email', input: { to: 'client@pme.fr' } },
}
const invoice: DeferredAgentAction = {
  toolId: 'mcp-srv-execute_action',
  title: 'sellsy.create_invoice',
  summary: '{}',
  params: { actionId: 'sellsy.create_invoice', input: {} },
}

describe('approvalGranted', () => {
  it('reads the resume form: only an explicit yes allows', () => {
    expect(approvalGranted({ [APPROVAL_FIELD]: true })).toBe(true)
    expect(approvalGranted({ [APPROVAL_FIELD]: 'true' })).toBe(true)
    expect(approvalGranted({ [APPROVAL_FIELD]: false })).toBe(false)
    expect(approvalGranted({ [APPROVAL_FIELD]: 'false' })).toBe(false)
    expect(approvalGranted({ [APPROVAL_FIELD]: 'oui' })).toBe(false)
    expect(approvalGranted({})).toBe(false)
    expect(approvalGranted(null)).toBe(false)
  })
})

describe('settleDeferredActions', () => {
  it('runs nothing when the person refused, and says so for each action', async () => {
    const execute = vi.fn()
    const settled = await settleDeferredActions([email, invoice], false, execute)
    expect(execute).not.toHaveBeenCalled()
    expect(settled).toEqual([
      { title: 'postmark.send_email', decision: 'deny', success: false },
      { title: 'sellsy.create_invoice', decision: 'deny', success: false },
    ])
  })

  it('runs each approved action once, with the parameters recorded when it was asked', async () => {
    const execute = vi.fn(async () => ({ success: true as const, output: { ok: true } }))
    const settled = await settleDeferredActions([email], true, execute)
    expect(execute).toHaveBeenCalledTimes(1)
    expect(execute).toHaveBeenCalledWith(email)
    expect(settled).toEqual([
      { title: 'postmark.send_email', decision: 'allow', success: true, output: { ok: true } },
    ])
  })

  it('reports an action that failed without stopping the others', async () => {
    const execute = vi
      .fn()
      .mockRejectedValueOnce(new Error('Connect injoignable'))
      .mockResolvedValueOnce({ success: true, output: {} })
    const settled = await settleDeferredActions([email, invoice], true, execute)
    expect(settled[0]).toMatchObject({
      decision: 'allow',
      success: false,
      error: 'Connect injoignable',
    })
    expect(settled[1]).toMatchObject({ decision: 'allow', success: true })
  })
})

describe('pendingActionsView', () => {
  it('shows the person what waits for them, never the recorded parameters', () => {
    const view = pendingActionsView([email])
    expect(view).toEqual([{ title: 'postmark.send_email', summary: '{"to":"client@pme.fr"}' }])
    expect(JSON.stringify(view)).not.toContain('actionId')
  })
})
