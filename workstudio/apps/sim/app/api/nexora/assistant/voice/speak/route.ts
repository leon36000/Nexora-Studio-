import { type NextRequest, NextResponse } from 'next/server'
import { assistantSpeakContract } from '@/lib/api/contracts/nexora-voice'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { resolveUsageModel } from '@/lib/nexora/document-ai/client'
import { nexoraSpeak } from '@/lib/nexora/voice/client'
import { authorizeVoiceCall, voiceFailure } from '@/app/api/nexora/assistant/voice/surface'

export const dynamic = 'force-dynamic'

/**
 * Raw binary route: « Lire à voix haute ». Says one piece of an answer with the instance's first
 * Speech synthesis model and returns the audio, which Nexora API meters like any model call.
 * Members of the workspace only; nothing is stored.
 */
export const POST = withRouteHandler(async (request: NextRequest) => {
  const parsed = await parseRequest(assistantSpeakContract, request, {})
  if (!parsed.success) return parsed.response
  const { workspaceId, text } = parsed.data.body
  const access = await authorizeVoiceCall(workspaceId)
  if ('refusal' in access) return access.refusal
  try {
    const options = { signal: request.signal }
    const model = await resolveUsageModel('speech', undefined, options)
    const spoken = await nexoraSpeak({ text, model, format: 'wav' }, options)
    return new NextResponse(new Uint8Array(spoken.audio), {
      headers: { 'Content-Type': spoken.mimeType, 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return voiceFailure(error)
  }
})
