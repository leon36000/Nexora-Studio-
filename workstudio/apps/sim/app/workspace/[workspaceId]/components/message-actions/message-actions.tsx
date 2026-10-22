'use client'

import { memo, useEffect, useRef, useState } from 'react'
import {
  Check,
  ChipModal,
  ChipModalBody,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  type ClipboardContent,
  cn,
  Duplicate,
  Split,
  ThumbsDown,
  ThumbsUp,
  Tooltip,
  toast,
  useCopyToClipboard,
} from '@sim/emcn'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { isApiClientError } from '@/lib/api/client/errors'
import { isLiveAssistantMessageId } from '@/lib/mothership/chat/live-message-id'
import { organizationRoutes } from '@/lib/navigation/paths'
import { useChatSurface } from '@/app/workspace/[workspaceId]/home/components/chat-surface-context'
import { useSubmitCopilotFeedback } from '@/hooks/queries/copilot-feedback'
import { useForkMothershipChat } from '@/hooks/queries/mothership-chats'
import { useFolderStore } from '@/stores/folders/store'

const ICON_CLASS = 'size-[14px]'
const BUTTON_CLASS =
  'flex size-[44px] items-center md:size-[26px] justify-center rounded-[6px] text-[var(--text-icon)] transition-colors hover-hover:bg-[var(--surface-hover)] focus-visible:outline-hidden'

interface MessageActionsProps {
  content: string
  getCopyContent?: () => string
  hasCopyContent?: boolean
  prepareContentForCopy?: (content: string) => ClipboardContent
  userQuery: string | undefined
  requestId?: string
  messageId?: string
}

/** Fork refusals whose message tells the person what to do: the response is unfinished, or the chat is too long. */
const FORK_REFUSAL_STATUSES = new Set([409, 413])

export const MessageActions = memo(function MessageActions({
  content,
  getCopyContent,
  hasCopyContent,
  prepareContentForCopy,
  userQuery,
  requestId,
  messageId,
}: MessageActionsProps) {
  const t = useTranslations('shell.messageActions')
  const router = useRouter()
  const params = useParams<{ workspaceId?: string; organizationId?: string }>()
  const owner = params.organizationId
    ? { organizationId: params.organizationId }
    : params.workspaceId
  const { chatId } = useChatSurface()
  const { copied, copy: copyMessage } = useCopyToClipboard({ resetMs: 1500 })
  const [copiedRequestId, setCopiedRequestId] = useState(false)
  const [pendingFeedback, setPendingFeedback] = useState<'up' | 'down' | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const requestIdTimeoutRef = useRef<number | null>(null)
  const submitFeedback = useSubmitCopilotFeedback()
  const forkChat = useForkMothershipChat(owner)

  useEffect(() => {
    return () => {
      if (requestIdTimeoutRef.current !== null) {
        window.clearTimeout(requestIdTimeoutRef.current)
      }
    }
  }, [])

  const copyToClipboard = () => {
    const contentToCopy = getCopyContent?.() ?? content
    if (!contentToCopy) return
    const copyContent = prepareContentForCopy?.(contentToCopy) ?? contentToCopy
    if (typeof copyContent === 'string' && !copyContent) return
    void copyMessage(copyContent)
  }

  const copyRequestId = async () => {
    if (!requestId) return
    try {
      await navigator.clipboard.writeText(requestId)
      setCopiedRequestId(true)
      if (requestIdTimeoutRef.current !== null) {
        window.clearTimeout(requestIdTimeoutRef.current)
      }
      requestIdTimeoutRef.current = window.setTimeout(() => setCopiedRequestId(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  const handleFeedbackClick = (type: 'up' | 'down') => {
    if (chatId && userQuery) {
      setPendingFeedback(type)
      setFeedbackText('')
      setCopiedRequestId(false)
    }
  }

  const handleSubmitFeedback = () => {
    if (!pendingFeedback || !chatId || !userQuery) return
    const text = feedbackText.trim()
    if (!text) {
      setPendingFeedback(null)
      setFeedbackText('')
      return
    }
    submitFeedback.mutate({
      chatId,
      userQuery,
      agentResponse: content,
      isPositiveFeedback: pendingFeedback === 'up',
      feedback: text,
    })
    setPendingFeedback(null)
    setFeedbackText('')
  }

  const handleModalClose = (open: boolean) => {
    if (!open) {
      setPendingFeedback(null)
      setFeedbackText('')
      setCopiedRequestId(false)
    }
  }

  const handleFork = async () => {
    if (!owner || !chatId || !messageId || forkChat.isPending) return
    try {
      const result = await forkChat.mutateAsync({ chatId, upToMessageId: messageId })
      if (result.failedFileCopies) {
        toast.warning(t('filesNotCopied', { count: result.failedFileCopies }))
      }
      if (params.organizationId) {
        router.push(organizationRoutes(params.organizationId).chat(result.id))
      } else {
        useFolderStore.getState().clearChatSelection()
        router.push(`/workspace/${params.workspaceId}/chat/${result.id}`)
      }
    } catch (error) {
      toast.error(
        isApiClientError(error) && FORK_REFUSAL_STATUSES.has(error.status)
          ? error.message
          : t('forkFailed')
      )
    }
  }

  const canCopyContent = hasCopyContent ?? Boolean(content)
  const canSubmitFeedback = Boolean(chatId && userQuery)
  // A live (just-streamed) assistant message carries a synthetic id that the
  // persisted transcript doesn't know — forking it would 400. The button
  // appears once the transcript refetch swaps in the persisted message id.
  const canFork = Boolean(owner && chatId && messageId && !isLiveAssistantMessageId(messageId))
  if (!canCopyContent && !canSubmitFeedback && !canFork) return null

  return (
    <>
      <div className='flex items-center gap-0.5'>
        {canCopyContent && (
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type='button'
                aria-label={t('copyMessage')}
                onClick={copyToClipboard}
                className={BUTTON_CLASS}
              >
                {copied ? <Check className={ICON_CLASS} /> : <Duplicate className={ICON_CLASS} />}
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content side='top'>
              {copied ? t('copiedMessage') : t('copyMessage')}
            </Tooltip.Content>
          </Tooltip.Root>
        )}
        {canSubmitFeedback && (
          <>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type='button'
                  aria-label={t('like')}
                  onClick={() => handleFeedbackClick('up')}
                  className={BUTTON_CLASS}
                >
                  <ThumbsUp className={ICON_CLASS} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content side='top'>{t('goodResponse')}</Tooltip.Content>
            </Tooltip.Root>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type='button'
                  aria-label={t('dislike')}
                  onClick={() => handleFeedbackClick('down')}
                  className={BUTTON_CLASS}
                >
                  <ThumbsDown className={ICON_CLASS} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content side='top'>{t('badResponse')}</Tooltip.Content>
            </Tooltip.Root>
          </>
        )}
        {canFork && (
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type='button'
                aria-label={t('fork')}
                onClick={handleFork}
                disabled={forkChat.isPending}
                className={cn(BUTTON_CLASS, forkChat.isPending && 'cursor-not-allowed opacity-50')}
              >
                <Split className={cn(ICON_CLASS, 'rotate-90')} />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content side='top'>{t('fork')}</Tooltip.Content>
          </Tooltip.Root>
        )}
      </div>

      <ChipModal
        open={pendingFeedback !== null}
        onOpenChange={handleModalClose}
        srTitle={t('giveFeedback')}
      >
        <ChipModalHeader onClose={() => handleModalClose(false)}>
          {t('giveFeedback')}
        </ChipModalHeader>
        <ChipModalBody>
          <ChipModalField
            type='textarea'
            title={t('feedback')}
            value={feedbackText}
            onChange={setFeedbackText}
            rows={6}
            minHeight={140}
            resizable
            placeholder={pendingFeedback === 'up' ? t('helpfulPlaceholder') : t('wrongPlaceholder')}
          />
        </ChipModalBody>
        <ChipModalFooter
          onCancel={() => handleModalClose(false)}
          secondaryActions={
            pendingFeedback === 'down' && requestId
              ? [{ label: copiedRequestId ? t('copied') : t('copyId'), onClick: copyRequestId }]
              : undefined
          }
          primaryAction={{
            label: t('submit'),
            onClick: handleSubmitFeedback,
          }}
        />
      </ChipModal>
    </>
  )
})
