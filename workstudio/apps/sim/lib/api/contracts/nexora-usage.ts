import { z } from 'zod'
import { defineRouteContract } from '@/lib/api/contracts/types'

const usageDaySchema = z.object({
  date: z.string(),
  requests: z.number(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
})

export const nexoraUsageResponseSchema = z.object({
  days: z.array(usageDaySchema),
  totals: z.object({
    requests: z.number(),
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
    kgCO2eq: z.number(),
  }),
})

export type NexoraUsageResponse = z.output<typeof nexoraUsageResponseSchema>

export const nexoraUsageQuerySchema = z.object({
  days: z
    .string()
    .optional()
    .transform((value) => Math.min(Math.max(Number(value) || 30, 1), 90)),
})

/** Model consumption of this instance, as metered by Nexora API (Nexora edition). */
export const getNexoraUsageContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/usage',
  query: nexoraUsageQuerySchema,
  response: { mode: 'json', schema: nexoraUsageResponseSchema },
})
