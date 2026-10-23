import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { workflowEditAccessContract } from '@/lib/api/contracts/realtime-workflow-access'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { checkInternalApiKey, createUnauthorizedResponse } from '@/lib/mothership/request/http'
import { isWorkflowEditingWithheldForUser } from '@/lib/workflows/editing-access'

/**
 * POST /api/internal/workflow-edit-access — the realtime server's question, before it lets a
 * socket write a workflow: does this user's permission group withhold workflow editing? Internal
 * only, gated on the shared `x-api-key: INTERNAL_API_SECRET`, like the other realtime callbacks.
 */
export const POST = withRouteHandler(async (request: NextRequest) => {
  if (!checkInternalApiKey(request).success) return createUnauthorizedResponse()

  const parsed = await parseRequest(workflowEditAccessContract, request, {})
  if (!parsed.success) return parsed.response
  const { userId, workflowId } = parsed.data.body

  const withheld = await isWorkflowEditingWithheldForUser(userId, workflowId)
  if (withheld === null) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }
  return NextResponse.json({ withheld })
})
