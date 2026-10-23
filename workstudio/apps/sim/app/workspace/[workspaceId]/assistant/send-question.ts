import { createLogger } from '@sim/logger'
import type { AssistantMessage, AssistantMessageFile } from '@/lib/api/contracts/nexora-assistant'
import { isAgentUnpublishedError } from '@/hooks/queries/nexora-assistant'

const logger = createLogger('NexoraAssistantSend')

/** A file as the deployed chat receives it (a data URL); never stored by the Assistant. */
export interface ChatFilePayload {
  name: string
  type: string
  size: number
  data: string
}

/** Why a message could not be sent or asked again, worded by the page. */
export type TurnNotice =
  | { kind: 'save-failed' }
  | { kind: 'agent-unpublished' }
  | { kind: 'upload-failed'; name: string }
  | { kind: 'attachments-missing' }

interface SendQuestionInput {
  /** `null` creates the conversation first. */
  conversationId: string | null
  files: File[]
  /** « Arrêter »: aborted before the question is stored, nothing is kept. */
  signal: AbortSignal
  createConversation(): Promise<string>
  deleteConversation(conversationId: string): Promise<unknown>
  appendQuestion(conversationId: string, files: AssistantMessageFile[]): Promise<AssistantMessage>
  readFile(file: File): Promise<ChatFilePayload>
  onConversationCreated(conversationId: string): void
  /** The conversation created for this question was deleted again. */
  onConversationDiscarded(): void
}

type SendQuestionOutcome =
  | {
      status: 'sent'
      conversationId: string
      question: AssistantMessage
      chatFiles: ChatFilePayload[]
    }
  | { status: 'stopped' }
  | { status: 'failed'; notice: TurnNotice }

function noticeFor(error: unknown): TurnNotice {
  return isAgentUnpublishedError(error) ? { kind: 'agent-unpublished' } : { kind: 'save-failed' }
}

/**
 * Stores a question (creating its conversation first when needed) and reads its files for the
 * agent. The conversation keeps only each file's name, type and size: the file itself goes to
 * the agent with the question. A conversation created here is deleted again when the question is
 * never stored — save failure, unreadable file, or « Arrêter » before the save — so a failed
 * first message leaves no empty conversation behind; an existing conversation is never deleted.
 */
export async function sendQuestion(input: SendQuestionInput): Promise<SendQuestionOutcome> {
  let created: string | null = null
  const discard = async (outcome: Exclude<SendQuestionOutcome, { status: 'sent' }>) => {
    if (created) {
      const conversationId = created
      await input.deleteConversation(conversationId).catch((error: unknown) => {
        logger.warn('Failed to delete the empty conversation', { conversationId, error })
      })
      input.onConversationDiscarded()
    }
    return outcome
  }

  let conversationId = input.conversationId
  if (!conversationId) {
    try {
      conversationId = await input.createConversation()
    } catch (error) {
      return { status: 'failed', notice: noticeFor(error) }
    }
    created = conversationId
    input.onConversationCreated(conversationId)
    if (input.signal.aborted) return discard({ status: 'stopped' })
  }

  const chatFiles: ChatFilePayload[] = []
  for (const file of input.files) {
    try {
      chatFiles.push(await input.readFile(file))
    } catch (error) {
      logger.warn('Failed to read an attachment', { name: file.name, error })
      return discard({ status: 'failed', notice: { kind: 'upload-failed', name: file.name } })
    }
    if (input.signal.aborted) return discard({ status: 'stopped' })
  }

  let question: AssistantMessage
  try {
    question = await input.appendQuestion(
      conversationId,
      input.files.map((file) => ({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
      }))
    )
  } catch (error) {
    return discard({ status: 'failed', notice: noticeFor(error) })
  }
  return { status: 'sent', conversationId, question, chatFiles }
}

/**
 * The files to send again when an answer is regenerated: those kept from sending the question on
 * this page, none for a question without files, or `null` when the question had files this page
 * no longer holds (after a reload) — the agent must not answer as if there were none.
 */
export function filesForRegeneration(
  question: AssistantMessage,
  sent: { questionId: string; files: ChatFilePayload[] } | null
): { files: ChatFilePayload[] | undefined } | null {
  if (sent?.questionId === question.id) return { files: sent.files }
  if (question.files.length === 0) return { files: undefined }
  return null
}
