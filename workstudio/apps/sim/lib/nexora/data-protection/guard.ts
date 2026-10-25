import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { isRecordLike } from '@sim/utils/object'
import {
  type FoundPersonalData,
  PersonalDataRefusedError,
  PersonalDataServiceError,
  PersonalDataUnsupportedError,
} from '@/lib/nexora/data-protection/errors'
import { protectTexts } from '@/lib/nexora/data-protection/masking'
import { isOffInstanceModel } from '@/lib/nexora/data-protection/model-location'
import type { ProtectionNote } from '@/lib/nexora/data-protection/notes'
import {
  type DataProtectionPolicy,
  loadDataProtection,
  resolveMode,
} from '@/lib/nexora/data-protection/policy'

const logger = createLogger('NexoraDataProtection')

/** A chat message in the OpenAI shape, which is all the guard needs to know about. */
export interface ChatMessageLike {
  role?: unknown
  content?: unknown
}

export interface GuardInput<M extends ChatMessageLike> {
  messages: readonly M[]
  /** The model the messages are about to go to: `vllm/<name>`, `ollama/<name>` or a Nexora API name. */
  model: string
  /** The workspace the call is made for; `null` for a call that names none (an instance key). */
  workspaceId: string | null
}

export interface GuardDeps {
  loadPolicy: () => Promise<DataProtectionPolicy>
  isOffInstance: (model: string) => Promise<boolean>
  protect: (texts: readonly string[]) => Promise<{ texts: string[]; found: FoundPersonalData }>
}

export const defaultGuardDeps: GuardDeps = {
  loadPolicy: loadDataProtection,
  isOffInstance: (model) => isOffInstanceModel(model),
  protect: (texts) => protectTexts(texts),
}

/** Where a message keeps text a person or a document wrote. */
type Slot = { message: number; part: number | null; text: string }

function textSlots(messages: readonly ChatMessageLike[]): Slot[] {
  const slots: Slot[] = []
  messages.forEach((message, index) => {
    const { content } = message
    if (typeof content === 'string') {
      slots.push({ message: index, part: null, text: content })
    } else if (Array.isArray(content)) {
      content.forEach((part, partIndex) => {
        if (
          isRecordLike(part) &&
          (part.type === 'text' || part.type === 'input_text') &&
          typeof part.text === 'string'
        ) {
          slots.push({ message: index, part: partIndex, text: part.text })
        }
      })
    }
  })
  return slots
}

function withTexts<M extends ChatMessageLike>(
  messages: readonly M[],
  slots: readonly Slot[],
  texts: readonly string[]
): M[] {
  const copies = [...messages]
  const copied = new Set<number>()
  slots.forEach((slot, index) => {
    if (texts[index] === slot.text) return
    const original = copies[slot.message]
    if (!copied.has(slot.message)) {
      copies[slot.message] = { ...original }
      copied.add(slot.message)
    }
    const copy = copies[slot.message] as Record<string, unknown>
    if (slot.part === null) {
      copy.content = texts[index]
    } else {
      const parts = [...(copy.content as unknown[])]
      parts[slot.part] = { ...(parts[slot.part] as Record<string, unknown>), text: texts[index] }
      copy.content = parts
    }
  })
  return copies
}

async function policyOrStop(deps: GuardDeps): Promise<DataProtectionPolicy> {
  try {
    return await deps.loadPolicy()
  } catch (error) {
    logger.error('The personal-data policy could not be read; the request is not sent', {
      error: getErrorMessage(error),
    })
    throw new PersonalDataServiceError()
  }
}

/**
 * Applies the personal-data policy of the workspace to the messages of a call before they go to a
 * model. Only a model off this server is concerned; with the mode `mask` the messages come back
 * as a masked copy (the caller's own are never touched), with `refuse` a request that holds
 * personal data is stopped with {@link PersonalDataRefusedError}. `applied` says what was done, for
 * the trace; it is `null` when nothing was masked.
 *
 * Throws {@link PersonalDataServiceError} when the policy cannot be read or the local service
 * does not answer: an unprotected request is not sent.
 */
export async function guardChatMessages<M extends ChatMessageLike>(
  input: GuardInput<M>,
  deps: GuardDeps = defaultGuardDeps
): Promise<{ messages: readonly M[]; applied: ProtectionNote | null }> {
  const unchanged = { messages: input.messages, applied: null }
  const mode = resolveMode(await policyOrStop(deps), input.workspaceId)
  if (mode === 'allow') return unchanged
  if (!(await deps.isOffInstance(input.model))) return unchanged

  const slots = textSlots(input.messages)
  const { texts, found } = await deps.protect(slots.map((slot) => slot.text))
  const masked = Object.values(found).reduce((sum, count) => sum + count, 0)
  if (masked === 0) return unchanged
  if (mode === 'refuse') throw new PersonalDataRefusedError(found)
  return {
    messages: withTexts(input.messages, slots, texts),
    applied: { mode: 'mask', model: input.model, found, masked },
  }
}

/**
 * For a provider whose messages the guard cannot read and so cannot mask: stops the call, with
 * {@link PersonalDataUnsupportedError}, when the workspace protects personal data and the model is
 * off this server. A call that is not concerned goes through.
 */
export async function assertCallNeedsNoProtection(
  input: Pick<GuardInput<ChatMessageLike>, 'model' | 'workspaceId'>,
  deps: GuardDeps = defaultGuardDeps
): Promise<void> {
  const mode = resolveMode(await policyOrStop(deps), input.workspaceId)
  if (mode === 'allow') return
  if (await deps.isOffInstance(input.model)) throw new PersonalDataUnsupportedError()
}
