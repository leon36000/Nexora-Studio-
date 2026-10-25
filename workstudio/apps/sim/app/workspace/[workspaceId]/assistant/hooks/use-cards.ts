'use client'

import { useState } from 'react'
import { createLogger } from '@sim/logger'
import type { AssistantAgent, AssistantCard } from '@/lib/api/contracts/nexora-assistant'
import { buildSubmission } from '@/lib/nexora/assistant/workflow-run'
import {
  useAppendAssistantMessage,
  useCreateAssistantConversation,
  useUpdateAssistantMessageCard,
} from '@/hooks/queries/nexora-assistant'
import { useResumeAssistantWorkflow } from '@/hooks/queries/nexora-assistant-extended'

const logger = createLogger('NexoraAssistantCards')

type WorkflowRunCard = Extract<AssistantCard, { kind: 'workflow_run' }>

interface RecordCardTurnInput {
  /** `null` opens the conversation first. */
  conversationId: string | null
  agent: AssistantAgent
  projectId?: string
  /** The member's side of the exchange, as the thread shows it. */
  question: string
  /** A short text for the answer that carries the card (reading aloud, copy). */
  answer: string
  card: AssistantCard
}

/**
 * Adds an exchange whose answer is a card (a launched workflow, a created task) to a conversation,
 * opening it first when needed. Resolves the conversation and the id of the message that holds the
 * card.
 */
export function useRecordCardTurn(workspaceId: string) {
  const { mutateAsync: createConversation } = useCreateAssistantConversation()
  const { mutateAsync: appendMessage } = useAppendAssistantMessage()

  return async ({
    conversationId,
    agent,
    projectId,
    question,
    answer,
    card,
  }: RecordCardTurnInput): Promise<{ conversationId: string; messageId: string }> => {
    const targetId =
      conversationId ??
      (
        await createConversation({
          workspaceId,
          workflowId: agent.workflowId,
          firstMessage: question,
          ...(projectId ? { projectId } : {}),
        })
      ).id
    await appendMessage({ conversationId: targetId, role: 'user', content: question })
    const saved = await appendMessage({
      conversationId: targetId,
      role: 'assistant',
      content: answer,
      card,
    })
    return { conversationId: targetId, messageId: saved.id }
  }
}

interface ResolveRunInput {
  conversationId: string
  messageId: string
  card: WorkflowRunCard
  approved: boolean
  comment: string
}

/**
 * Answers the validation a launched workflow waits for, then updates its card with what the run
 * did next. Remembers which card is being answered, and which answer failed.
 */
export function useResolveWorkflowRun() {
  const resume = useResumeAssistantWorkflow()
  const updateCard = useUpdateAssistantMessageCard()
  const [answeringId, setAnsweringId] = useState<string | null>(null)
  const [failedId, setFailedId] = useState<string | null>(null)

  const resolve = async ({
    conversationId,
    messageId,
    card,
    approved,
    comment,
  }: ResolveRunInput) => {
    const { pause } = card.payload
    if (!pause) return
    setAnsweringId(messageId)
    setFailedId(null)
    try {
      const result = await resume.mutateAsync({
        resumePath: pause.resumePath,
        submission: buildSubmission(pause.fields, approved, comment),
      })
      await updateCard.mutateAsync({
        conversationId,
        messageId,
        card: {
          kind: 'workflow_run',
          payload: {
            ...card.payload,
            status: result.status,
            output: result.output,
            error: result.error,
            pause: result.pause,
            resolution: result.status === 'paused' ? null : approved ? 'approved' : 'refused',
          },
        },
      })
    } catch (error) {
      logger.warn('A workflow validation could not be answered', { messageId, error })
      setFailedId(messageId)
    } finally {
      setAnsweringId(null)
    }
  }

  return { resolve, answeringId, failedId }
}
