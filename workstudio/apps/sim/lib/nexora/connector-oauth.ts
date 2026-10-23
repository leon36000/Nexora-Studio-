import { sleep } from '@sim/utils/helpers'

/** Where a Nexora Connect OAuth request stands, as the connectors status route reports it. */
export interface ConnectorOAuthStatus {
  status: 'initiated' | 'connected' | 'failed' | 'expired'
  errorMessage: string | null
}

/** How a followed OAuth consent ended. */
export type ConnectorOAuthOutcome =
  | 'connected'
  | 'failed'
  | 'expired'
  | 'superseded'
  | 'closed'
  | 'timeout'
  | 'cancelled'

export interface PollConnectorOAuthOptions {
  fetchStatus: () => Promise<ConnectorOAuthStatus>
  isPopupClosed: () => boolean
  signal?: AbortSignal
  wait?: (ms: number) => Promise<void>
  now?: () => number
  intervalMs?: number
  timeoutMs?: number
  /**
   * How long checks go on once the window reports closed. A provider page served with COOP
   * `same-origin` severs the opener, which then sees a live window as closed, so a closed
   * window alone does not end the flow.
   */
  closedGraceMs?: number
}

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 10 * 60 * 1000
const CLOSED_GRACE_MS = 2 * 60 * 1000

/** Nexora Connect's wording when another request for the same service replaced this one. */
const SUPERSEDED_MESSAGE = /newer authorization request replaced/i

/**
 * Follows an OAuth consent opened in a popup: checks its status every two seconds until it is
 * connected, refused, expired, replaced, abandoned (window closed for the grace period), or ten
 * minutes have passed. A failing status check rejects.
 */
export async function pollConnectorOAuth({
  fetchStatus,
  isPopupClosed,
  signal,
  wait = sleep,
  now = Date.now,
  intervalMs = POLL_INTERVAL_MS,
  timeoutMs = POLL_TIMEOUT_MS,
  closedGraceMs = CLOSED_GRACE_MS,
}: PollConnectorOAuthOptions): Promise<ConnectorOAuthOutcome> {
  const startedAt = now()
  let closedAt: number | null = null

  while (true) {
    await wait(intervalMs)
    if (signal?.aborted) return 'cancelled'
    if (now() - startedAt >= timeoutMs) return 'timeout'

    const { status, errorMessage } = await fetchStatus()
    if (signal?.aborted) return 'cancelled'
    if (status === 'connected' || status === 'expired') return status
    if (status === 'failed') {
      return errorMessage && SUPERSEDED_MESSAGE.test(errorMessage) ? 'superseded' : 'failed'
    }

    if (closedAt === null && isPopupClosed()) closedAt = now()
    if (closedAt !== null && now() - closedAt >= closedGraceMs) return 'closed'
  }
}
