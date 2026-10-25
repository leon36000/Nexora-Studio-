import { z } from 'zod'
import { defineRouteContract } from '@/lib/api/contracts/types'

/** The person's answer to « Demander avant d'agir »: the token travelled in their own stream. */
export const answerToolConfirmationContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/tool-confirmations/[id]',
  params: z.object({ id: z.string().min(8).max(64) }),
  body: z.object({
    token: z.string().min(32).max(128),
    decision: z.enum(['allow', 'deny']),
  }),
  response: { mode: 'json', schema: z.object({ decision: z.enum(['allow', 'deny']) }) },
})
