import {
  PersonalDataRefusedError,
  PersonalDataServiceError,
  PersonalDataUnsupportedError,
} from '@/lib/nexora/data-protection/errors'
import { guardChatMessages } from '@/lib/nexora/data-protection/guard'
import type { ProtectionNote } from '@/lib/nexora/data-protection/notes'
import { gatewayErrors } from '@/lib/nexora/developer-api/errors'
import type { GatewayKey } from '@/lib/nexora/developer-api/policy'

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
    if (
      error instanceof PersonalDataRefusedError ||
      error instanceof PersonalDataUnsupportedError
    ) {
      throw gatewayErrors.personalDataNotAllowed(error.message)
    }
    if (error instanceof PersonalDataServiceError) {
      throw gatewayErrors.personalDataProtectionUnavailable(error.message)
    }
    throw error
  }
}
