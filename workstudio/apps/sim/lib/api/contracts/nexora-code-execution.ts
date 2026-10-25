import { z } from 'zod'
import { defineRouteContract } from '@/lib/api/contracts/types'

const codeExecutionViewSchema = z.object({
  /** The sandbox service (profile « code ») is configured for this instance. */
  configured: z.boolean(),
  /** An administrator allowed AI-written code to run. */
  enabled: z.boolean(),
  /** The service answered its health check just now. */
  reachable: z.boolean(),
  updatedAt: z.string().optional(),
  limits: z
    .object({
      cpus: z.number(),
      memoryMb: z.number(),
      tmpfsMb: z.number(),
      pids: z.number(),
      maxRunSeconds: z.number(),
      maxSandboxes: z.number(),
      runtime: z.string(),
    })
    .optional(),
})

/** Réglages › Exécution de code: whether the Python interpreter is installed and allowed. */
export const getNexoraCodeExecutionContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/code-execution',
  response: { mode: 'json', schema: codeExecutionViewSchema },
})

/** Turns code execution on or off (instance administrators only). */
export const updateNexoraCodeExecutionContract = defineRouteContract({
  method: 'PUT',
  path: '/api/nexora/code-execution',
  body: z.object({ enabled: z.boolean() }),
  response: { mode: 'json', schema: codeExecutionViewSchema },
})
