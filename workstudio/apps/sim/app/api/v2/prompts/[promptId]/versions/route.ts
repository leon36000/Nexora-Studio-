import { v2CreatePromptVersionContract } from '@/lib/api/contracts/v2/prompts'
import { defineV2JsonRoute, v2ApiKeyAuth, v2RateLimits } from '@/lib/api/server/routes'
import { nexoraPromptOperations } from '@/lib/nexora/prompts/application/operations'
import { createPromptVersionUseCase } from '@/lib/nexora/prompts/application/use-cases'
import { promptResourceErrorPolicy, toV2Prompt } from '@/app/api/v2/prompts/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** POST /api/v2/prompts/[promptId]/versions — Save the next version; labels stay where they were. */
export const POST = defineV2JsonRoute({
  contract: v2CreatePromptVersionContract,
  operation: nexoraPromptOperations.createVersion,
  auth: v2ApiKeyAuth,
  rateLimit: v2RateLimits.publicApi,
  errorPolicy: promptResourceErrorPolicy,
  mapInput: ({ params, body }) => ({ ...body, promptRef: params.promptId }),
  useCase: createPromptVersionUseCase,
  present: ({ prompt, version }) => ({ data: toV2Prompt(prompt, version) }),
})
