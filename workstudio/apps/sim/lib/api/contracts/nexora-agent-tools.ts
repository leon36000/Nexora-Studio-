import { z } from 'zod'
import { defineRouteContract } from '@/lib/api/contracts/types'

/** Which built-in tools this instance can run now, for the agent form's switches. */
export const getNexoraAgentToolsContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/agent-tools',
  response: {
    mode: 'json',
    schema: z.object({ codeInterpreter: z.boolean(), webSearch: z.boolean() }),
  },
})
