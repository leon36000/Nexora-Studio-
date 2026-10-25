import {
  PersonalDataRefusedError,
  PersonalDataServiceError,
  PersonalDataUnsupportedError,
} from '@/lib/nexora/data-protection/errors'
import {
  assertCallNeedsNoProtection,
  guardChatMessages,
  guardTexts,
} from '@/lib/nexora/data-protection/guard'
import type { ProtectionNote } from '@/lib/nexora/data-protection/notes'
import { gatewayErrors } from '@/lib/nexora/developer-api/errors'
import type { GatewayKey } from '@/lib/nexora/developer-api/policy'

/** A refusal or a stopped call of the personal-data policy as the gateway answers it (403 / 503). */
function asGatewayError(error: unknown): unknown {
  if (error instanceof PersonalDataRefusedError || error instanceof PersonalDataUnsupportedError) {
    return gatewayErrors.personalDataNotAllowed(error.message)
  }
  if (error instanceof PersonalDataServiceError) {
    return gatewayErrors.personalDataProtectionUnavailable(error.message)
  }
  return error
}

/**
 * The messages of a call as they may go to a model off this server: the personal-data policy of
 * the key's workspace (the instance's for an instance key) applied, a refusal answered 403 in the
 * OpenAI error shape. Used by the live calls and by the requests of a batch alike.
 */
export async function protectedMessages(
  key: Pick<GatewayKey, 'workspaceId'>,
  model: string,
  messages: unknown
): Promise<{ messages: unknown; protection: ProtectionNote | null }> {
  if (!Array.isArray(messages)) return { messages, protection: null }
  try {
    const guarded = await guardChatMessages({ messages, model, workspaceId: key.workspaceId })
    return { messages: guarded.messages, protection: guarded.applied }
  } catch (error) {
    throw asGatewayError(error)
  }
}

/**
 * The `input` of an embeddings call as it may go to a model off this server: every text of it
 * under the personal-data policy (a text, or a list of texts; token lists are numbers and stay).
 * The input comes back as given when nothing changed.
 */
export async function protectedEmbeddingInput(
  key: Pick<GatewayKey, 'workspaceId'>,
  model: string,
  input: unknown
): Promise<{ input: unknown; protection: ProtectionNote | null }> {
  const texts = typeof input === 'string' ? [input] : Array.isArray(input) ? input : []
  const positions = texts.flatMap((entry, index) => (typeof entry === 'string' ? [index] : []))
  if (positions.length === 0) return { input, protection: null }
  try {
    const guarded = await guardTexts({
      texts: positions.map((index) => texts[index] as string),
      model,
      workspaceId: key.workspaceId,
    })
    if (guarded.applied === null) return { input, protection: null }
    if (typeof input === 'string') return { input: guarded.texts[0], protection: guarded.applied }
    const copy = [...texts]
    positions.forEach((position, index) => {
      copy[position] = guarded.texts[index]
    })
    return { input: copy, protection: guarded.applied }
  } catch (error) {
    throw asGatewayError(error)
  }
}

/**
 * For a call whose content the policy cannot mask (speech, transcription): stops it, 403, when
 * the key's workspace protects personal data and the model is off this server.
 */
export async function assertGatewayCallNeedsNoProtection(
  key: Pick<GatewayKey, 'workspaceId'>,
  model: string
): Promise<void> {
  try {
    await assertCallNeedsNoProtection({ model, workspaceId: key.workspaceId })
  } catch (error) {
    throw asGatewayError(error)
  }
}
