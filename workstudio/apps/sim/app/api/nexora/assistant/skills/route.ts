import { listAssistantSkillsContract } from '@/lib/api/contracts/nexora-assistant-extras'
import {
  defineInternalJsonRoute,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { listAssistantSkills } from '@/lib/nexora/assistant/skills'
import { assistantErrorPolicy } from '@/app/api/nexora/assistant/surface'

/** The workspace's skills a member can name with `@` in a message. */
export const GET = defineInternalJsonRoute({
  contract: listAssistantSkillsContract,
  operation: listAssistantSkills.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({
    reason: 'Session-only read of the workspace’s skill names, at most 200 rows',
  }),
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ query }) => ({ workspaceId: query.workspaceId }),
  useCase: listAssistantSkills,
  present: ({ skills }) => ({ skills }),
})
