'use client'

import { useEffect, useRef, useState } from 'react'
import { createLogger } from '@sim/logger'
import type {
  AssistantAgent,
  AssistantMessage,
  AssistantMessageFile,
} from '@/lib/api/contracts/nexora-assistant'
import {
  type ChatFilePayload,
  filesForRegeneration,
  sendQuestion,
  type TurnNotice,
} from '@/app/workspace/[workspaceId]/assistant/send-question'
import {
  type ReplyErrorCode,
  streamAgentReply,
} from '@/app/workspace/[workspaceId]/assistant/stream-reply'
import {
  useAppendAssistantMessage,
  useCreateAssistantConversation,
  useDeleteAssistantConversation,
} from '@/hooks/queries/nexora-assistant'

const logger = createLogger('NexoraAssistantTurn')

/** A closing tab may send at most 64 KB; a UTF-8 character takes up to 4 bytes. */
const KEEPALIVE_TEXT_LIMIT = 15_000

/** The exchange in progress, shown after the stored messages until they include it. */
export interface PendingTurn {
  conversationId: string
  /** `null` when an answer is regenerated for a question already stored. */
  question: { id: string | null; content: string; files: AssistantMessageFile[] } | null
  answer: {
    id: string | null
    text: string
    status: 'waiting' | 'streaming' | 'done' | 'stopped' | 'error'
    error: ReplyErrorCode | null
  }
}

interface SendInput {
  /** `null` starts a new conversation with `agent`. */
  conversationId: string | null
  agent: AssistantAgent
  text: string
  files: File[]
}

interface LiveAnswer {
  conversationId: string
  text: string
  recorded: boolean
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function toChatFile(file: File): Promise<ChatFilePayload> {
  return {
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    data: await readAsDataUrl(file),
  }
}

/**
 * One exchange of the Assistant: records the question (with its files' names only: the files go
 * to the agent, not to storage), sends it to the agent's deployed chat with the conversation as
 * the agent's memory,
 * streams the answer and records it — marked interrupted when it was stopped, failed or cut by a
 * closing tab. Leaving the page stops the answer and records what was received.
 */
export function useAssistantTurn(
  workspaceId: string,
  onConversationCreated: (id: string) => void,
  onConversationDiscarded: () => void
) {
  const controllerRef = useRef<AbortController | null>(null)
  const liveRef = useRef<LiveAnswer | null>(null)
  const frameRef = useRef<number | null>(null)
  const sentFilesRef = useRef<{ questionId: string; files: ChatFilePayload[] } | null>(null)
  const { mutateAsync: createConversation } = useCreateAssistantConversation()
  const { mutateAsync: deleteConversation } = useDeleteAssistantConversation()
  const { mutate: appendMessage, mutateAsync: appendMessageAsync } = useAppendAssistantMessage()
  const [pending, setPending] = useState<PendingTurn | null>(null)
  const [notice, setNotice] = useState<TurnNotice | null>(null)
  const [preparing, setPreparing] = useState(false)

  useEffect(() => {
    const recordCutAnswer = () => {
      const live = liveRef.current
      if (!live || live.recorded || !live.text.trim()) return
      live.recorded = true
      appendMessage({
        conversationId: live.conversationId,
        role: 'assistant',
        content: live.text.slice(0, KEEPALIVE_TEXT_LIMIT),
        interrupted: true,
        keepalive: true,
      })
    }
    window.addEventListener('pagehide', recordCutAnswer)
    return () => {
      window.removeEventListener('pagehide', recordCutAnswer)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      controllerRef.current?.abort()
    }
  }, [appendMessage])

  const updateAnswer = (conversationId: string, change: Partial<PendingTurn['answer']>) => {
    setPending((previous) =>
      previous?.conversationId === conversationId
        ? { ...previous, answer: { ...previous.answer, ...change } }
        : previous
    )
  }

  const streamAnswer = async (
    conversationId: string,
    agent: AssistantAgent,
    input: string,
    files: ChatFilePayload[] | undefined,
    controller: AbortController
  ) => {
    const live: LiveAnswer = { conversationId, text: '', recorded: false }
    liveRef.current = live
    updateAnswer(conversationId, { status: 'streaming' })

    const outcome = await streamAgentReply({
      chatIdentifier: agent.chatIdentifier,
      body: { input, conversationId, ...(files?.length ? { files } : {}) },
      signal: controller.signal,
      onText: (text) => {
        live.text = text
        if (frameRef.current !== null) return
        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = null
          updateAnswer(conversationId, { text: live.text })
        })
      },
    })

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    if (controllerRef.current === controller) controllerRef.current = null
    if (liveRef.current === live) liveRef.current = null
    updateAnswer(conversationId, {
      text: outcome.text,
      status: outcome.status,
      error: outcome.status === 'error' ? outcome.code : null,
    })

    if (live.recorded || !outcome.text.trim()) return
    live.recorded = true
    try {
      const saved = await appendMessageAsync({
        conversationId,
        role: 'assistant',
        content: outcome.text,
        interrupted: outcome.status !== 'done',
      })
      updateAnswer(conversationId, { id: saved.id })
    } catch (error) {
      logger.warn('Failed to record the answer', { conversationId, error })
      setNotice({ kind: 'save-failed' })
    }
  }

  /** Resolves `false` when nothing was sent (the draft should be given back). */
  const send = async ({ conversationId, agent, text, files }: SendInput): Promise<boolean> => {
    setNotice(null)
    // Created now so « Arrêter » also stops the conversation creation, file reading and save.
    const controller = new AbortController()
    controllerRef.current = controller
    const pendingFiles: AssistantMessageFile[] = files.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
    }))
    const showPending = (targetId: string) =>
      setPending({
        conversationId: targetId,
        question: { id: null, content: text, files: pendingFiles },
        answer: { id: null, text: '', status: 'waiting', error: null },
      })
    if (conversationId) showPending(conversationId)

    setPreparing(true)
    const outcome = await sendQuestion({
      conversationId,
      files,
      signal: controller.signal,
      createConversation: async () => {
        const conversation = await createConversation({
          workspaceId,
          workflowId: agent.workflowId,
          firstMessage: text,
        })
        return conversation.id
      },
      deleteConversation,
      appendQuestion: (targetId, records) =>
        appendMessageAsync({
          conversationId: targetId,
          role: 'user',
          content: text,
          ...(records.length > 0 ? { files: records } : {}),
        }),
      readFile: toChatFile,
      onConversationCreated: (id) => {
        showPending(id)
        onConversationCreated(id)
      },
      onConversationDiscarded: () => onConversationDiscarded(),
    }).finally(() => setPreparing(false))

    if (outcome.status !== 'sent') {
      if (controllerRef.current === controller) controllerRef.current = null
      setPending(null)
      if (outcome.status === 'failed') setNotice(outcome.notice)
      return false
    }

    const { conversationId: targetId, question, chatFiles } = outcome
    sentFilesRef.current = { questionId: question.id, files: chatFiles }
    setPending((previous) =>
      previous?.conversationId === targetId && previous.question
        ? { ...previous, question: { ...previous.question, id: question.id } }
        : previous
    )
    void streamAnswer(targetId, agent, text, chatFiles, controller)
    return true
  }

  /**
   * Asks the agent again with the question's files, kept from sending it on this page; after a
   * reload they are gone, and the person is told so rather than answered without them.
   */
  const regenerate = (
    conversationId: string,
    agent: AssistantAgent,
    question: AssistantMessage
  ) => {
    setNotice(null)
    const replay = filesForRegeneration(question, sentFilesRef.current)
    if (!replay) {
      setNotice({ kind: 'attachments-missing' })
      return
    }
    const controller = new AbortController()
    controllerRef.current = controller
    setPending({
      conversationId,
      question: null,
      answer: { id: null, text: '', status: 'waiting', error: null },
    })
    void streamAnswer(conversationId, agent, question.content, replay.files, controller)
  }

  const stop = () => controllerRef.current?.abort()

  const isBusy =
    preparing || pending?.answer.status === 'waiting' || pending?.answer.status === 'streaming'

  return { pending, notice, isBusy, send, regenerate, stop, dismissNotice: () => setNotice(null) }
}
