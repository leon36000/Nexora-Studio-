'use client'

import { useState } from 'react'
import { Button, Chip, ChipTextarea, cn, Tooltip } from '@sim/emcn'
import { Loader, Send, X } from '@sim/emcn/icons'
import { toStringOrNull } from '@sim/utils/coerce'
import { generateId } from '@sim/utils/id'
import { toRecord } from '@sim/utils/object'
import { useTranslations } from 'next-intl'
import { useRunWorkflowOnce } from '@/hooks/queries/nexora-home'

interface TestMessage {
  id: string
  role: 'user' | 'assistant' | 'error'
  content: string
}

interface TestPanelProps {
  workflowId: string
  /** Saves pending form changes first, so the test runs what the form shows. */
  ensureSaved: () => Promise<boolean> // i18n-ignore: type signature
  onClose: () => void
}

/** A side chat that runs the agent's saved draft, one conversation at a time. */
export function TestPanel({ workflowId, ensureSaved, onClose }: TestPanelProps) {
  const t = useTranslations('agents.test')
  const { mutateAsync: runWorkflow, isPending } = useRunWorkflowOnce()
  const [messages, setMessages] = useState<TestMessage[]>([])
  const [conversationId, setConversationId] = useState(() => generateId())
  const [input, setInput] = useState('')

  const append = (role: TestMessage['role'], content: string) =>
    setMessages((previous) => [...previous, { id: generateId(), role, content }])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isPending) return
    setInput('')
    append('user', text)
    if (!(await ensureSaved())) {
      append('error', t('failed'))
      return
    }
    try {
      const result = await runWorkflow({ workflowId, input: { input: text, conversationId } })
      const answer = result.success ? toStringOrNull(toRecord(result.output).content) : null
      if (!result.success) append('error', t('failed'))
      else append(answer ? 'assistant' : 'error', answer || t('noAnswer'))
    } catch {
      append('error', t('failed'))
    }
  }

  const handleNewConversation = () => {
    setMessages([])
    setConversationId(generateId())
  }

  return (
    <aside className='flex w-full max-w-[400px] shrink-0 flex-col border-[var(--border)] border-l'>
      <div className='flex items-center justify-between gap-2 px-4 pt-3 pb-2'>
        <span className='text-[var(--text-body)] text-sm'>{t('title')}</span>
        <div className='flex items-center gap-1'>
          <Chip onClick={handleNewConversation} disabled={isPending}>
            {t('newConversation')}
          </Chip>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button
                type='button'
                variant='quiet'
                size='icon'
                onClick={onClose}
                aria-label={t('close')}
              >
                <X className='size-[14px]' />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>{t('close')}</Tooltip.Content>
          </Tooltip.Root>
        </div>
      </div>
      <div className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-2'>
        {messages.length === 0 && (
          <p className='text-[var(--text-muted)] text-caption'>{t('empty')}</p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'max-w-[90%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-small',
              message.role === 'user'
                ? 'self-end bg-[var(--surface-active)] text-[var(--text-body)]'
                : 'self-start border border-[var(--border)]',
              message.role === 'assistant' && 'text-[var(--text-body)]',
              message.role === 'error' && 'text-[var(--text-error)]'
            )}
          >
            {message.content}
          </div>
        ))}
        {isPending && (
          <div className='flex items-center gap-2 self-start text-[var(--text-muted)] text-caption'>
            <Loader className='size-[12px]' animate />
            {t('thinking')}
          </div>
        )}
      </div>
      <div className='flex items-end gap-2 border-[var(--border)] border-t px-4 py-3'>
        <ChipTextarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void handleSend()
            }
          }}
          placeholder={t('placeholder')}
          rows={2}
          className='min-w-0 flex-1'
        />
        <Chip
          variant='primary'
          leftIcon={Send}
          disabled={!input.trim() || isPending}
          onClick={() => void handleSend()}
        >
          {t('send')}
        </Chip>
      </div>
    </aside>
  )
}
