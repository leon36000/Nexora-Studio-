'use client'

import { Button, cn, Tooltip, useCopyToClipboard } from '@sim/emcn'
import { Check, Duplicate, Loader, Paperclip, RefreshCw } from '@sim/emcn/icons'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import type { AssistantMessageFile } from '@/lib/api/contracts/nexora-assistant'

/** Loaded on demand: keeps the Markdown renderer out of the page's first bundle. */
const MarkdownRenderer = dynamic(
  () => import('@/app/(interfaces)/chat/components/message/components/markdown-renderer')
)

interface MessageItemProps {
  role: 'user' | 'assistant'
  content: string
  files: AssistantMessageFile[]
  /** An answer still arriving: the text so far, or a loader before the first word. */
  isStreaming?: boolean
  /** A muted line under an answer (interrupted, stopped). */
  note?: string
  /** An error line under an answer. */
  error?: string
  /** Shown on the last answer only, when the agent can still be asked. */
  onRegenerate?: () => void
}

/** One message of the thread: the question as typed, the answer rendered as Markdown. */
export function MessageItem({
  role,
  content,
  files,
  isStreaming = false,
  note,
  error,
  onRegenerate,
}: MessageItemProps) {
  const t = useTranslations('assistant.thread')
  const { copied, copy } = useCopyToClipboard()

  if (role === 'user') {
    return (
      <article className='flex flex-col items-end gap-1.5'>
        {files.length > 0 && (
          <ul className='flex max-w-[85%] flex-wrap justify-end gap-1'>
            {files.map((file) => (
              <li
                key={`${file.name}:${file.size}`}
                className='flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[var(--text-muted)] text-caption'
              >
                <Paperclip className='size-[12px] shrink-0' />
                <span className='sr-only'>{t('attachment', { name: file.name })}</span>
                <span aria-hidden className='break-all'>
                  {file.name}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className='max-w-[85%] whitespace-pre-wrap break-words rounded-lg bg-[var(--surface-active)] px-3 py-2 text-[var(--text-body)] text-sm'>
          {content}
        </div>
      </article>
    )
  }

  const hasText = content.trim().length > 0

  return (
    <article className='flex flex-col gap-1.5'>
      {hasText ? (
        <div className='min-w-0 break-words text-[var(--text-body)] text-sm'>
          <MarkdownRenderer content={content} sameOriginImages />
        </div>
      ) : isStreaming ? (
        <Loader className='size-[14px] text-[var(--text-muted)]' animate />
      ) : null}
      {(note || error) && (
        <p
          className={cn(
            'text-caption',
            error ? 'text-[var(--text-error)]' : 'text-[var(--text-muted)]'
          )}
        >
          {error ?? note}
        </p>
      )}
      {!isStreaming && (hasText || onRegenerate) && (
        <div className='flex items-center gap-0.5'>
          {hasText && (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button
                  type='button'
                  variant='quiet'
                  size='icon'
                  onClick={() => void copy(content)}
                  aria-label={copied ? t('copied') : t('copy')}
                >
                  {copied ? (
                    <Check className='size-[14px]' />
                  ) : (
                    <Duplicate className='size-[14px]' />
                  )}
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>{copied ? t('copied') : t('copy')}</Tooltip.Content>
            </Tooltip.Root>
          )}
          {onRegenerate && (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button
                  type='button'
                  variant='quiet'
                  size='icon'
                  onClick={onRegenerate}
                  aria-label={t('regenerate')}
                >
                  <RefreshCw className='size-[14px]' />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>{t('regenerate')}</Tooltip.Content>
            </Tooltip.Root>
          )}
        </div>
      )}
    </article>
  )
}
