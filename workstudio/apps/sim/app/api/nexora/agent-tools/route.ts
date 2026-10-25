import { type NextRequest, NextResponse } from 'next/server'
import { getNexoraAgentToolsContract } from '@/lib/api/contracts/nexora-agent-tools'
import { parseRequest } from '@/lib/api/server'
import { getSession } from '@/lib/auth'
import { env } from '@/lib/core/config/env'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { isCodeExecutionEnabled } from '@/lib/nexora/code-execution'

export const dynamic = 'force-dynamic'

/**
 * Raw route: availability of the built-in tools is an instance fact (the sandbox service and an
 * administrator's switch, the SearXNG address), shown to every signed-in member building an agent.
 */
export const GET = withRouteHandler(async (request: NextRequest) => {
  const session = await getSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = await parseRequest(getNexoraAgentToolsContract, request, {})
  if (!parsed.success) return parsed.response
  return NextResponse.json({
    codeInterpreter: await isCodeExecutionEnabled(),
    webSearch: Boolean(env.SEARXNG_URL),
  })
})
