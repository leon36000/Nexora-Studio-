import { z } from 'zod'
import { defineRouteContract } from '@/lib/api/contracts/types'

/** The platform services Réglages › État checks, in display order. */
export const NEXORA_INSTANCE_SERVICES = [
  'postgres',
  'redis',
  'nexora-api',
  'nexora-connect',
  'realtime',
  'ollama',
  'searxng',
  'whisper',
] as const

const nexoraInstanceStatusSchema = z.object({
  /** The installed Nexora version (`NEXORA_VERSION`), or null when the server does not say. */
  version: z.string().min(1).max(100).nullable(),
  services: z
    .array(
      z.object({
        id: z.enum(NEXORA_INSTANCE_SERVICES),
        /** `not-configured`: the service is optional and off on this instance. */
        state: z.enum(['up', 'down', 'not-configured']),
      })
    )
    .max(NEXORA_INSTANCE_SERVICES.length),
  /** Free space, in whole gigabytes, on the volume holding uploaded files; null when unreadable. */
  diskFreeGb: z.number().int().nonnegative().nullable(),
  checkedAt: z.string().datetime(),
})

export type NexoraInstanceStatus = z.output<typeof nexoraInstanceStatusSchema>
export type NexoraServiceState = NexoraInstanceStatus['services'][number]['state']

/** The health of this Nexora instance (Nexora edition, instance admins only). */
export const getNexoraStatusContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/status',
  response: { mode: 'json', schema: nexoraInstanceStatusSchema },
})
