import { z } from 'zod'
import { defineRouteContract } from '@/lib/api/contracts/types'

const playgroundBodySchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required').max(128, 'workspaceId is too long'),
  /** As blocks store it (`vllm/<name>`) or the bare Nexora API name. */
  model: z.string().trim().min(1, 'model is required').max(160, 'model is too long'),
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string().max(32_000, 'message is too long'),
      })
    )
    .min(1, 'at least one message is required')
    .max(50, 'too many messages'),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(1).max(8192),
})

/** One Playground answer, streamed as `data: {"chunk"}` events then `data: {"done", "usage"}`. */
export const playgroundContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/playground',
  body: playgroundBodySchema,
  response: { mode: 'stream' },
})
