import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { type NextRequest, NextResponse } from 'next/server'
import { runEvalCronContract } from '@/lib/api/contracts/nexora-evaluations'
import { parseRequest } from '@/lib/api/server'
import { verifyCronAuth } from '@/lib/auth/internal'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { tickEvaluations } from '@/lib/nexora/evaluations/live'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const logger = createLogger('RunNexoraEvaluationsAPI')

/**
 * Nexora edition, every minute: starts the campaigns of the scheduled evaluations whose time has
 * come, then takes over the campaigns nobody runs (their server stopped). The campaigns
 * themselves run in the background of this process; the call returns at once. `asOf` (an ISO
 * date, with the cron secret) plays the clock of another moment, for tests of night schedules.
 */
export const GET = withRouteHandler(async (request: NextRequest) => {
  const authError = verifyCronAuth(request, 'evaluation schedules')
  if (authError) return authError

  const parsed = await parseRequest(runEvalCronContract, request, {})
  if (!parsed.success) return parsed.response
  const { asOf } = parsed.data.query

  try {
    const summary = await tickEvaluations(asOf ? new Date(asOf) : new Date())
    if (summary.started.length > 0 || summary.resumed.length > 0 || summary.failed.length > 0) {
      logger.info('Evaluation schedules ticked', summary)
    }
    return NextResponse.json({ success: true, ...summary })
  } catch (error) {
    logger.error('Failed to tick the evaluation schedules', { error })
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to tick the evaluation schedules') },
      { status: 500 }
    )
  }
})
