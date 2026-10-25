import { type NextRequest, NextResponse } from 'next/server'
import { playgroundContract } from '@/lib/api/contracts/nexora-playground'
import { parseRequest } from '@/lib/api/server'
import { getSession } from '@/lib/auth'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { describeWandFailure, nexoraWandStream } from '@/lib/nexora/wand'
import { getUserEntityPermissions } from '@/lib/workspaces/permissions/utils'
import {
  ModelNotAllowedError,
  validateModelProvider,
} from '@/ee/access-control/utils/permission-check'

export const dynamic = 'force-dynamic'

/**
 * Raw streaming route: relays one chat completion from Nexora API, metered there like every other
 * model call. Members of the workspace only; nothing is stored. Closing the page stops the answer.
 */
export const POST = withRouteHandler(async (request: NextRequest) => {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const parsed = await parseRequest(playgroundContract, request, {})
  if (!parsed.success) return parsed.response
  const { workspaceId, model, messages, temperature, maxTokens, reasoningEffort } = parsed.data.body
  if (!(await getUserEntityPermissions(session.user.id, 'workspace', workspaceId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    await validateModelProvider(session.user.id, workspaceId, model)
    const stream = await nexoraWandStream({
      messages,
      model: model.replace(/^vllm\//, ''),
      temperature,
      maxTokens,
      reasoningEffort,
      includeThinking: true,
      reportUsage: true,
      signal: request.signal,
      trace: {
        source: 'playground',
        workspaceId,
        userId: session.user.id,
        name: 'Playground',
      },
    })
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    })
  } catch (error) {
    if (error instanceof ModelNotAllowedError) {
      return NextResponse.json(
        {
          error: 'model_not_allowed',
          reason: `Votre groupe d’accès ne vous autorise pas le modèle « ${model.replace(/^vllm\//, '')} ».`,
        },
        { status: 403 }
      )
    }
    const failure = describeWandFailure(error)
    if (!failure) throw error
    return NextResponse.json(
      'reason' in failure
        ? { error: failure.code, reason: failure.reason }
        : { error: failure.code },
      { status: failure.status }
    )
  }
})
