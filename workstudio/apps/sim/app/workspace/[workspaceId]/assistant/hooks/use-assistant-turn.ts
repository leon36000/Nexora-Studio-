'use client'

import { useEffect, useRef, useState } from 'react'
import { createLogger } from '@sim/logger'
import type {
  AssistantAgent,
  AssistantMessage,
  AssistantMessageFile,
} from '@/lib/api/contracts/nexora-assistant'
import { uploadInternalFileSession } from '@/lib/uploads/client/session-upload'
import {
  type ReplyErrorCode,
  streamAgentReply,
} from '@/app/workspace/[workspaceId]/assistant/stream-reply'
import {
  isAgentUnpublishedError,
  useAppendAssistantMessage,
  useCreateAssistantConversation,
} from '@/hooks/queries/nexora-assistant'

const logger = createLogger('NexoraAssistantTurn')

/** A closing tab may send at most 64 KB; a UTF-8 character takes up to 4 bytes. */
const KEEPALIVE_TEXT_LIMIT = 15_000

interface ChatFilePayload {
  name: string
  type: string
  size: number
  data: string
}

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

/** Why a message could not be sent, worded by the page. */
export type TurnNotice =
  | { kind: 'save-failed' }
  | { kind: 'agent-unpublished' }
  | { kind: 'upload-failed'; name: string }

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

function noticeFor(error: unknown): TurnNotice {
  return isAgentUnpublishedError(error) ? { kind: 'agent-unpublished' } : { kind: 'save-failed' }
}

/**
 * One exchange of the Assistant: records the question (with its files, kept in the workspace's
 * storage), sends it to the agent's deployed chat with the conversation as the agent's memory,
 * streams the answer and records it — marked interrupted when it was stopped, failed or cut by a
 * closing tab. Leaving the page stops the answer and records what was received.
 */
export function useAssistantTurn(workspaceId: string, onConversationCreated: (id: string) => void) {
  const controllerRef = useRef<AbortController | null>(null)
  const liveRef = useRef<LiveAnswer | null>(null)
  const frameRef = useRef<number | null>(null)
  const sentFilesRef = useRef<{ questionId: string; files: ChatFilePayload[] } | null>(null)
  const { mutateAsync: createConversation } = useCreateAssistantConversation()
  const { mutate: appendMessage, mutateAsync: appendMessageAsync } = useAppendAssistantMessage()
  const [pending, setPending] = useState<PendingTurn | null>(null)
  const [notice, setNotice] = useState<TurnNotice | null>(null)

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
    files: ChatFilePayload[] | undefined
  ) => {
    const controller = new AbortController()
    controllerRef.current = controller
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
    let id = conversationId
    if (!id) {
      try {
        const conversation = await createConversation({
          workspaceId,
          workflowId: agent.workflowId,
          firstMessage: text,
        })
        id = conversation.id
        onConversationCreated(id)
      } catch (error) {
        setNotice(noticeFor(error))
        return false
      }
    }

    const targetId = id
    setPending({
      conversationId: targetId,
      question: {
        id: null,
        content: text,
        files: files.map((file) => ({
          name: file.name,
          key: '',
          type: file.type,
          size: file.size,
        })),
      },
      answer: { id: null, text: '', status: 'waiting', error: null },
    })

    const records: AssistantMessageFile[] = []
    const chatFiles: ChatFilePayload[] = []
    for (const file of files) {
      try {
        const [stored, payload] = await Promise.all([
          uploadInternalFileSession({ purpose: 'mothership_attachment', workspaceId, file }),
          toChatFile(file),
        ])
        records.push({ name: file.name, key: stored.key, type: file.type, size: file.size })
        chatFiles.push(payload)
      } catch (error) {
        logger.warn('Failed to upload an attachment', { name: file.name, error })
        setPending(null)
        setNotice({ kind: 'upload-failed', name: file.name })
        return false
      }
    }

    let question: AssistantMessage
    try {
      question = await appendMessageAsync({
        conversationId: targetId,
        role: 'user',
        content: text,
        ...(records.length > 0 ? { files: records } : {}),
      })
    } catch (error) {
      setPending(null)
      setNotice(noticeFor(error))
      return false
    }

    sentFilesRef.current = { questionId: question.id, files: chatFiles }
    setPending((previous) =>
      previous?.conversationId === targetId && previous.question
        ? { ...previous, question: { ...previous.question, id: question.id, files: records } }
        : previous
    )
    void streamAnswer(targetId, agent, text, chatFiles)
    return true
  }

  /** Asks the agent again; the files of a question sent from this page are sent again too. */
  const regenerate = (
    conversationId: string,
    agent: AssistantAgent,
    question: AssistantMessage
  ) => {
    setNotice(null)
    const files =
      sentFilesRef.current?.questionId === question.id ? sentFilesRef.current.files : undefined
    setPending({
      conversationId,
      question: null,
      answer: { id: null, text: '', status: 'waiting', error: null },
    })
    void streamAnswer(conversationId, agent, question.content, files)
  }

  const stop = () => controllerRef.current?.abort()

  const isBusy = pending?.answer.status === 'waiting' || pending?.answer.status === 'streaming'

  return { pending, notice, isBusy, send, regenerate, stop, dismissNotice: () => setNotice(null) }
}
