import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { type NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/internal'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { runScheduledPurge } from '@/lib/nexora/traces/purge'
import { loadTraceSettings } from '@/lib/nexora/traces/settings'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const logger = createLogger('PurgeNexoraTracesAPI')

/**
 * Nexora edition: retention sweep of the traces (and of the Assistant conversations when the
 * administrator set a retention for them), hourly. Reads the instance's settings fresh, so a
 * change of retention applies at the next run.
 */
export const GET = withRouteHandler(async (request: NextRequest) => {
  const authError = verifyCronAuth(request, 'trace purge')
  if (authError) return authError

  try {
    const summary = await runScheduledPurge(new Date(), await loadTraceSettings())
    if (summary.deletedTraces > 0 || summary.deletedConversations > 0) {
      logger.info('Trace retention applied', summary)
    }
    return NextResponse.json({ success: true, ...summary })
  } catch (error) {
    logger.error('Failed to apply the trace retention', { error })
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to apply the trace retention') },
      { status: 500 }
    )
  }
})
