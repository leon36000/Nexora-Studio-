import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { NexoraDocumentAiError } from '@/lib/nexora/document-ai/client'
import { getUserEntityPermissions } from '@/lib/workspaces/permissions/utils'

/**
 * The Assistant's voice routes answer members of the workspace only. Returns the user id, or the
 * refusal to send.
 */
export async function authorizeVoiceCall(
  workspaceId: string | null
): Promise<{ userId: string } | { refusal: NextResponse }> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { refusal: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (!workspaceId) {
    return { refusal: NextResponse.json({ error: 'workspaceId is required' }, { status: 400 }) }
  }
  if (!(await getUserEntityPermissions(session.user.id, 'workspace', workspaceId))) {
    return { refusal: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { userId: session.user.id }
}

/**
 * A voice failure the page words in French from its `code`: no model for the usage, the voice
 * service unavailable, a recording too long or refused. Anything else is not ours to hide.
 */
export function voiceFailure(error: unknown): NextResponse {
  if (!(error instanceof NexoraDocumentAiError)) throw error
  return NextResponse.json({ error: error.code, message: error.message }, { status: error.status })
}
