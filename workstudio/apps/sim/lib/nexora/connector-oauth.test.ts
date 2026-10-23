/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest'
import {
  type ConnectorOAuthStatus,
  type PollConnectorOAuthOptions,
  pollConnectorOAuth,
} from '@/lib/nexora/connector-oauth'

const INITIATED: ConnectorOAuthStatus = { status: 'initiated', errorMessage: null, errorCode: null }

/** A virtual clock: `wait` advances it instead of sleeping. */
function harness(
  statuses: (ConnectorOAuthStatus | ((at: number) => ConnectorOAuthStatus))[],
  overrides: Partial<PollConnectorOAuthOptions> = {}
) {
  let clock = 0
  const waits: number[] = []
  const fetchedAt: number[] = []
  const fetchStatus = vi.fn(async () => {
    fetchedAt.push(clock)
    const next = statuses.length > 1 ? statuses.shift() : statuses[0]
    if (!next) throw new Error('no status scripted')
    return typeof next === 'function' ? next(clock) : next
  })
  const options: PollConnectorOAuthOptions = {
    fetchStatus,
    isPopupClosed: () => false,
    wait: async (ms) => {
      waits.push(ms)
      clock += ms
    },
    now: () => clock,
    ...overrides,
  }
  return { options, fetchStatus, waits, fetchedAt, clock: () => clock }
}

describe('pollConnectorOAuth', () => {
  it('waits two seconds between checks and reports a completed consent', async () => {
    const h = harness([
      INITIATED,
      INITIATED,
      { status: 'connected', errorMessage: null, errorCode: null },
    ])
    await expect(pollConnectorOAuth(h.options)).resolves.toBe('connected')
    expect(h.fetchStatus).toHaveBeenCalledTimes(3)
    expect(h.waits).toEqual([2000, 2000, 2000])
  })

  it('stops on a refused or an expired request', async () => {
    const refused = harness([
      INITIATED,
      { status: 'failed', errorMessage: 'access_denied', errorCode: 'access_denied' },
    ])
    await expect(pollConnectorOAuth(refused.options)).resolves.toBe('failed')
    const expired = harness([{ status: 'expired', errorMessage: null, errorCode: null }])
    await expect(pollConnectorOAuth(expired.options)).resolves.toBe('expired')
  })

  it('tells a request replaced by another one apart from a refusal', async () => {
    const h = harness([
      {
        status: 'failed',
        errorMessage: 'Une autre demande a remplacé celle-ci.',
        errorCode: 'request_superseded',
      },
    ])
    await expect(pollConnectorOAuth(h.options)).resolves.toBe('superseded')
  })

  it('gives up after ten minutes without an answer, without checking again', async () => {
    const h = harness([INITIATED])
    await expect(pollConnectorOAuth(h.options)).resolves.toBe('timeout')
    expect(h.clock()).toBeLessThanOrEqual(10 * 60 * 1000 + 2000)
    expect(Math.max(...h.fetchedAt)).toBeLessThan(10 * 60 * 1000 + 2000)
    expect(h.fetchStatus.mock.calls.length).toBeLessThanOrEqual(300)
  })

  it('stops once the window has stayed closed for the grace period', async () => {
    const h = harness([INITIATED], { isPopupClosed: () => true, closedGraceMs: 10_000 })
    await expect(pollConnectorOAuth(h.options)).resolves.toBe('closed')
    expect(h.clock()).toBeGreaterThanOrEqual(10_000)
    expect(h.clock()).toBeLessThan(20_000)
  })

  it('still reports a consent that completes just after the window reports closed', async () => {
    const h = harness(
      [
        (at) =>
          at >= 6000 ? { status: 'connected', errorMessage: null, errorCode: null } : INITIATED,
      ],
      { isPopupClosed: () => true, closedGraceMs: 10_000 }
    )
    await expect(pollConnectorOAuth(h.options)).resolves.toBe('connected')
  })

  it('checks once more after the grace period before calling the window closed', async () => {
    let closed = false
    const h = harness(
      [
        (at) => {
          if (at >= 4000) closed = true
          return at >= 14_000
            ? { status: 'connected', errorMessage: null, errorCode: null }
            : INITIATED
        },
      ],
      { isPopupClosed: () => closed, closedGraceMs: 10_000 }
    )
    await expect(pollConnectorOAuth(h.options)).resolves.toBe('connected')
  })

  it('stops without checking again once cancelled', async () => {
    const controller = new AbortController()
    const h = harness([INITIATED], {
      signal: controller.signal,
      wait: async () => {
        controller.abort()
      },
    })
    await expect(pollConnectorOAuth(h.options)).resolves.toBe('cancelled')
    expect(h.fetchStatus).not.toHaveBeenCalled()
  })

  it('lets a failing status check reject, so the page can word the error', async () => {
    const h = harness([INITIATED])
    h.fetchStatus.mockRejectedValueOnce(new Error('unavailable'))
    await expect(pollConnectorOAuth(h.options)).rejects.toThrow('unavailable')
  })
})
