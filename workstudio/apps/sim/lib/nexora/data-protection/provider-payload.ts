import { isRecordLike } from '@sim/utils/object'
import { PersonalDataRefusedError } from '@/lib/nexora/data-protection/errors'
import {
  assertCallNeedsNoProtection,
  type ChatMessageLike,
  defaultGuardDeps,
  type GuardDeps,
  guardChatMessages,
} from '@/lib/nexora/data-protection/guard'
import { noteExecutionProtection } from '@/lib/nexora/data-protection/notes'

/** What identifies a model call of an agent: the model it goes to, and for whom. */
interface ProviderCall {
  model: string
  workspaceId?: string
  executionId?: string
}

/**
 * The last stop before an agent's turn leaves for a model: applies the personal-data policy of its
 * workspace to the provider payload. Every turn goes through here — the first, each turn of the
 * tool loop (which resends the conversation, tool results included) and the final synthesis — so
 * the whole conversation is masked each time while the agent's own memory keeps the original.
 *
 * Only the OpenAI-style `messages` can be masked. For another protocol, a model off this server
 * under a protective policy is refused (`PersonalDataUnsupportedError`) rather than sent as is.
 * What was done is noted under the execution id, for the trace.
 */
export async function protectProviderPayload<T>(
  call: ProviderCall,
  protocol: string,
  payload: T,
  deps: GuardDeps = defaultGuardDeps
): Promise<T> {
  const workspaceId = call.workspaceId ?? null
  if (protocol !== 'chat-completions') {
    await assertCallNeedsNoProtection({ model: call.model, workspaceId }, deps)
    return payload
  }
  if (!isRecordLike(payload) || !Array.isArray(payload.messages)) return payload
  try {
    const guarded = await guardChatMessages(
      { messages: payload.messages as ChatMessageLike[], model: call.model, workspaceId },
      deps
    )
    if (!guarded.applied) return payload
    if (call.executionId) noteExecutionProtection(call.executionId, guarded.applied)
    return { ...payload, messages: guarded.messages }
  } catch (error) {
    if (error instanceof PersonalDataRefusedError && call.executionId) {
      noteExecutionProtection(call.executionId, {
        mode: 'refuse',
        model: call.model,
        found: error.found,
        masked: Object.values(error.found).reduce((sum, count) => sum + count, 0),
      })
    }
    throw error
  }
}
