import { v2GetPromptContract } from '@/lib/api/contracts/v2/prompts'
import { defineV2JsonRoute, v2ApiKeyAuth, v2RateLimits } from '@/lib/api/server/routes'
import { nexoraPromptOperations } from '@/lib/nexora/prompts/application/operations'
import { getPromptUseCase } from '@/lib/nexora/prompts/application/use-cases'
import { promptResourceErrorPolicy, toV2Prompt } from '@/app/api/v2/prompts/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** GET /api/v2/prompts/[promptId] — A prompt with the version a label points at, or a given version. */
export const GET = defineV2JsonRoute({
  contract: v2GetPromptContract,
  operation: nexoraPromptOperations.read,
  auth: v2ApiKeyAuth,
  rateLimit: v2RateLimits.publicApi,
  errorPolicy: promptResourceErrorPolicy,
  mapInput: ({ params, query }) => ({
    workspaceId: query.workspaceId,
    promptRef: params.promptId,
    pick:
      query.version !== undefined
        ? { version: query.version }
        : { selector: query.label ?? ('production' as const) },
  }),
  useCase: getPromptUseCase,
  present: ({ prompt, version }) => ({ data: toV2Prompt(prompt, version) }),
})
