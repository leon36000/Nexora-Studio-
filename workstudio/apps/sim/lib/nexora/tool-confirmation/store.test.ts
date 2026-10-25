import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createConfirmationRequest,
  decideConfirmation,
  waitForDecision,
} from '@/lib/nexora/tool-confirmation/store'

const request = { executionId: 'exec-1', title: 'postmark.send_email', summary: '{"to":"a@b.fr"}' }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
})
afterEach(() => {
  vi.useRealTimers()
})

describe('confirmation store', () => {
  it('gives the requester a token and keeps only its fingerprint', async () => {
    const created = await createConfirmationRequest(request)
    expect(created.token.length).toBeGreaterThanOrEqual(32)
    expect(created.id).toMatch(/^[0-9a-f-]{16,}$/)
    expect(JSON.stringify(created)).not.toContain('postmark')
  })

  it('refuses a wrong token and records nothing', async () => {
    const { id } = await createConfirmationRequest(request)
    expect(await decideConfirmation(id, 'not-the-token', 'allow')).toBe('forbidden')
    const waiting = waitForDecision(id, { timeoutMs: 1_000, pollMs: 100 })
    await vi.advanceTimersByTimeAsync(1_100)
    expect(await waiting).toBeNull()
  })

  it('keeps the first decision of two (two clicks, two tabs)', async () => {
    const { id, token } = await createConfirmationRequest(request)
    expect(await decideConfirmation(id, token, 'deny')).toBe('decided')
    expect(await decideConfirmation(id, token, 'allow')).toBe('already_decided')
    expect(await waitForDecision(id, { timeoutMs: 1_000, pollMs: 100 })).toBe('deny')
  })

  it('hands a decision to a waiter that was already waiting', async () => {
    const { id, token } = await createConfirmationRequest(request)
    const waiting = waitForDecision(id, { timeoutMs: 60_000, pollMs: 100 })
    await vi.advanceTimersByTimeAsync(300)
    await decideConfirmation(id, token, 'allow')
    await vi.advanceTimersByTimeAsync(150)
    expect(await waiting).toBe('allow')
  })

  it('treats a request nobody answered in time as expired: no decision, and a late answer is refused', async () => {
    const { id, token } = await createConfirmationRequest(request, { ttlSeconds: 2 })
    const waiting = waitForDecision(id, { timeoutMs: 5_000, pollMs: 200 })
    await vi.advanceTimersByTimeAsync(5_200)
    expect(await waiting).toBeNull()
    expect(await decideConfirmation(id, token, 'allow')).toBe('expired')
  })

  it('stops waiting when the run is cancelled', async () => {
    const { id } = await createConfirmationRequest(request)
    const controller = new AbortController()
    const waiting = waitForDecision(id, {
      timeoutMs: 60_000,
      pollMs: 100,
      signal: controller.signal,
    })
    await vi.advanceTimersByTimeAsync(200)
    controller.abort()
    await vi.advanceTimersByTimeAsync(150)
    expect(await waiting).toBeNull()
  })

  it('answers « expired » for an id that never existed', async () => {
    expect(await decideConfirmation('inconnu-0000-0000', 'x'.repeat(40), 'allow')).toBe('expired')
  })
})
