import { createLogger } from '@sim/logger'

const logger = createLogger('NexoraRestart')

/** Leaves time for the response to reach the browser before the server stops accepting work. */
const RESTART_DELAY_MS = 1_000

/**
 * Nexora edition: asks WorkStudio to stop gracefully, exactly as `docker compose restart` would
 * (Next's SIGTERM handler closes the server after in-flight requests). The container's
 * `restart: unless-stopped` policy starts it again, and the bootstrap then reads the saved
 * settings. Only a supervised production server may do this: under `next dev` nothing would
 * bring it back.
 */
export function isRestartSupervised(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function scheduleGracefulRestart(): void {
  logger.info('Restarting WorkStudio to apply the instance settings')
  setTimeout(() => process.kill(process.pid, 'SIGTERM'), RESTART_DELAY_MS)
}
