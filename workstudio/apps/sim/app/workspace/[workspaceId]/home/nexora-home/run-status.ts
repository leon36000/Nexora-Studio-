/** How the home page shows a run's status. */
export type RunStatus = 'success' | 'error' | 'running' | 'paused' | 'cancelled' | 'unknown'

/**
 * Maps a stored execution status onto the home page's badges. Unlike the logs page's
 * `getDisplayStatus` (where everything unrecognized reads as `info`), a paused or unknown run is
 * never shown as succeeded: only `completed` is.
 */
export function toRunStatus(status: string | null): RunStatus {
  switch (status) {
    case 'completed':
      return 'success'
    case 'failed':
      return 'error'
    case 'cancelled':
      return 'cancelled'
    case 'paused':
      return 'paused'
    case 'pending':
    case 'running':
    case 'redacting':
    case 'cancelling':
      return 'running'
    default:
      return 'unknown'
  }
}
