import { existsSync } from 'node:fs'
import { createLogger } from '@sim/logger'

const logger = createLogger('NexoraRestart')

/** Leaves time for the response to reach the browser before the server stops accepting work. */
const RESTART_DELAY_MS = 1_000
/**
 * How long the graceful stop may take. Next closes the server once in-flight requests end, and a
 * long-lived stream (an assistant answer, a run's event stream) would hold it for minutes; past
 * this the process exits anyway and those clients reconnect to the restarted server.
 */
const HARD_EXIT_AFTER_MS = 15_000

let restartScheduled = false

type SupervisionEnv = Partial<Record<'NODE_ENV' | 'NEXORA_SUPERVISED', string>>

/**
 * Nexora edition: whether something will start WorkStudio again once it stops — a production
 * server in a container (`/.dockerenv`, or `NEXORA_SUPERVISED=1` set by `deploy/compose.yml`,
 * whose `restart: unless-stopped` brings it back). A production build started by hand, or
 * `next dev`, would simply stay down.
 */
export function isRestartSupervised(
  env: SupervisionEnv = process.env,
  pathExists: (path: string) => boolean = existsSync
): boolean {
  if (env.NODE_ENV !== 'production') return false
  return env.NEXORA_SUPERVISED === '1' || pathExists('/.dockerenv')
}

/** Whether this process already accepted a restart and is on its way down. */
export function isRestartInProgress(): boolean {
  return restartScheduled
}

/**
 * Asks WorkStudio to stop gracefully, exactly as `docker compose restart` would (Next's SIGTERM
 * handler closes the server after in-flight requests), with a hard exit if that takes longer than
 * {@link HARD_EXIT_AFTER_MS}. The container starts again and the bootstrap reads the saved
 * settings. Returns `false`, doing nothing, when a restart is already under way.
 */
export function scheduleGracefulRestart(): boolean {
  if (restartScheduled) return false
  restartScheduled = true
  logger.info('Restarting WorkStudio to apply the instance settings')
  setTimeout(() => {
    setTimeout(() => {
      logger.warn('Graceful stop still waiting on open requests; exiting now')
      process.exit(0)
    }, HARD_EXIT_AFTER_MS).unref()
    process.kill(process.pid, 'SIGTERM')
  }, RESTART_DELAY_MS)
  return true
}
