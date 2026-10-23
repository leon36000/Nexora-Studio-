import { statfs } from 'node:fs/promises'
import { db } from '@sim/db'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { sql } from 'drizzle-orm'
import {
  NEXORA_INSTANCE_SERVICES,
  type NexoraInstanceStatus,
  type NexoraServiceState,
} from '@/lib/api/contracts/nexora-status'
import { env } from '@/lib/core/config/env'
import { getRedisClient } from '@/lib/core/config/redis'
import { getSocketServerUrl } from '@/lib/core/utils/urls'
import { UPLOAD_DIR_SERVER } from '@/lib/uploads/core/setup.server'

const logger = createLogger('NexoraInstanceStatus')

/** Each check answers within this time, or its service is reported down. */
const PROBE_TIMEOUT_MS = 2_000
const BYTES_PER_GIGABYTE = 1_000_000_000

type NexoraServiceId = (typeof NEXORA_INSTANCE_SERVICES)[number]

/** Resolves when the service answers, rejects otherwise; null when the service is not configured. */
type ServiceProbe = ((signal: AbortSignal) => Promise<void>) | null

export interface InstanceStatusSources {
  version: string | undefined
  probes: Record<NexoraServiceId, ServiceProbe>
  readDiskFreeBytes: () => Promise<number>
}

/**
 * The health endpoint of a service, on its origin only: a configured address may carry a path
 * (`/v1`, `/mcp`) or credentials, neither of which a health check needs.
 */
export function serviceProbeUrl(baseUrl: string | null | undefined, path: string): string | null {
  const trimmed = baseUrl?.trim()
  if (!trimmed) return null
  try {
    return `${new URL(trimmed).origin}${path}`
  } catch {
    return null
  }
}

/** Whole gigabytes (10^9 bytes, rounded down), as `nexora status` prints them. */
export function freeGigabytes(bytes: number): number {
  return Math.floor(bytes / BYTES_PER_GIGABYTE)
}

/** A GET on an internal health endpoint that must answer 2xx. */
export function httpProbe(url: string | null, fetchFn: typeof fetch = fetch): ServiceProbe {
  if (!url) return null
  return async (signal) => {
    // boundary-raw-fetch: a health check on another service of the instance, not a same-origin route
    const response = await fetchFn(url, { signal })
    await response.body?.cancel()
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  }
}

async function runProbe(id: NexoraServiceId, probe: ServiceProbe): Promise<NexoraServiceState> {
  if (!probe) return 'not-configured'
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('timeout')), PROBE_TIMEOUT_MS)
  const deadline = new Promise<never>((_, reject) => {
    controller.signal.addEventListener('abort', () => reject(controller.signal.reason), {
      once: true,
    })
  })
  try {
    await Promise.race([probe(controller.signal), deadline])
    return 'up'
  } catch (error) {
    logger.warn('Service unreachable', { service: id, error: getErrorMessage(error) })
    return 'down'
  } finally {
    clearTimeout(timer)
    controller.abort()
  }
}

function sourcesFromEnv(): InstanceStatusSources {
  const redis = getRedisClient()
  const connectBase = env.NEXORA_CONNECT_ADMIN_URL || env.NEXORA_CONNECT_MCP_URL
  return {
    version: env.NEXORA_VERSION,
    probes: {
      postgres: async () => {
        await db.execute(sql`select 1`)
      },
      redis: redis
        ? async () => {
            await redis.ping()
          }
        : null,
      'nexora-api': httpProbe(serviceProbeUrl(env.VLLM_BASE_URL, '/health')),
      'nexora-connect': httpProbe(serviceProbeUrl(connectBase, '/health')),
      realtime: httpProbe(serviceProbeUrl(getSocketServerUrl(), '/health')),
      ollama: httpProbe(serviceProbeUrl(env.OLLAMA_URL, '/api/version')),
      searxng: httpProbe(serviceProbeUrl(env.SEARXNG_URL, '/healthz')),
      whisper: httpProbe(serviceProbeUrl(env.NEXORA_WHISPER_URL, '/health')),
    },
    readDiskFreeBytes: async () => {
      const stats = await statfs(UPLOAD_DIR_SERVER)
      return stats.bavail * stats.bsize
    },
  }
}

/**
 * The state of every platform service, checked in parallel over the internal network, with the
 * installed version and the free disk space. A service that fails or does not answer in time is
 * reported down; the status itself never fails. Only states leave this module: no address, no
 * credential, no upstream error text.
 */
export async function readInstanceStatus(
  sources: InstanceStatusSources = sourcesFromEnv()
): Promise<NexoraInstanceStatus> {
  const [states, diskFreeBytes] = await Promise.all([
    Promise.all(NEXORA_INSTANCE_SERVICES.map((id) => runProbe(id, sources.probes[id]))),
    sources.readDiskFreeBytes().catch((error: unknown) => {
      logger.warn('Free disk space unreadable', { error: getErrorMessage(error) })
      return null
    }),
  ])
  return {
    version: sources.version?.trim() || null,
    services: NEXORA_INSTANCE_SERVICES.map((id, index) => ({ id, state: states[index] })),
    diskFreeGb: diskFreeBytes === null ? null : freeGigabytes(diskFreeBytes),
    checkedAt: new Date().toISOString(),
  }
}
