import { type NextRequest, NextResponse } from 'next/server'
import { answerToolConfirmationContract } from '@/lib/api/contracts/nexora-tool-confirmations'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { decideConfirmation } from '@/lib/nexora/tool-confirmation/store'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Raw route: a confirmation request belongs to one running agent, and the one-time token that
 * proves who may answer travelled only in the stream of the person talking to it — so a public
 * chat visitor can answer for their own run, and nobody else can.
 */
export const POST = withRouteHandler(async (request: NextRequest, context: RouteContext) => {
  const parsed = await parseRequest(answerToolConfirmationContract, request, context)
  if (!parsed.success) return parsed.response
  const { token, decision } = parsed.data.body
  const outcome = await decideConfirmation(parsed.data.params.id, token, decision)
  if (outcome === 'forbidden') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (outcome === 'already_decided') {
    return NextResponse.json({ error: 'already-decided' }, { status: 409 })
  }
  if (outcome === 'expired') return NextResponse.json({ error: 'expired' }, { status: 409 })
  return NextResponse.json({ decision })
})
