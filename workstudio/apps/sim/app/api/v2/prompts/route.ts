import { v2CreatePromptContract, v2ListPromptsContract } from '@/lib/api/contracts/v2/prompts'
import { cursorRoute, cursorScopeKey } from '@/lib/api/cursor-binding'
import {
  defineV2JsonRoute,
  v2ApiKeyAuth,
  v2OrchestrationErrorPolicy,
  v2RateLimits,
} from '@/lib/api/server/routes'
import { nexoraPromptOperations } from '@/lib/nexora/prompts/application/operations'
import { createPromptUseCase, listPromptsUseCase } from '@/lib/nexora/prompts/application/use-cases'
import { readSortedCursor, writeSortedCursor } from '@/app/api/v2/lib/response'
import { toV2Prompt, toV2PromptSummary } from '@/app/api/v2/prompts/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Every param that changes which prompts, in which order, this list returns. */
function promptCursorFilters(query: { workspaceId: string; search?: string }) {
  return cursorScopeKey(cursorRoute(v2ListPromptsContract), {
    workspaceId: query.workspaceId,
    search: query.search,
  })
}

/** GET /api/v2/prompts — List the prompts of a workspace. */
export const GET = defineV2JsonRoute({
  contract: v2ListPromptsContract,
  operation: nexoraPromptOperations.list,
  auth: v2ApiKeyAuth,
  rateLimit: v2RateLimits.publicApi,
  errorPolicy: v2OrchestrationErrorPolicy,
  mapInput: ({ query }) => ({
    workspaceId: query.workspaceId,
    search: query.search,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    limit: query.limit,
    cursorKeys: readSortedCursor(
      query.cursor,
      query.sortBy,
      query.sortOrder,
      promptCursorFilters(query)
    ),
  }),
  useCase: listPromptsUseCase,
  present: ({ data, nextCursorKeys }, { query }) => ({
    data: data.map(toV2PromptSummary),
    nextCursor: writeSortedCursor(
      nextCursorKeys,
      query.sortBy,
      query.sortOrder,
      promptCursorFilters(query)
    ),
  }),
})

/** POST /api/v2/prompts — Create a prompt with its version 1, labelled production and test. */
export const POST = defineV2JsonRoute({
  contract: v2CreatePromptContract,
  operation: nexoraPromptOperations.create,
  auth: v2ApiKeyAuth,
  rateLimit: v2RateLimits.publicApi,
  errorPolicy: v2OrchestrationErrorPolicy,
  mapInput: ({ body }) => body,
  useCase: createPromptUseCase,
  present: ({ prompt, version }) => ({ data: toV2Prompt(prompt, version) }),
})
