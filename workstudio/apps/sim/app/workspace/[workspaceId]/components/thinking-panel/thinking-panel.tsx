'use client'

import { useId, useState } from 'react'
import { cn } from '@sim/emcn'
import { ChevronDown } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'

interface ThinkingPanelProps {
  /** The reasoning received so far. */
  text: string
  /** The answer is still streaming. */
  streaming: boolean
  /** The model has started its answer. */
  answerStarted: boolean
}

/**
 * Nexora edition: a reasoning model's reasoning, apart from its answer. Open while the model
 * reasons and nothing else has come, folded as soon as the answer starts; a click overrides both.
 */
export function ThinkingPanel({ text, streaming, answerStarted }: ThinkingPanelProps) {
  const t = useTranslations('agents.thinking')
  const contentId = useId()
  const [expanded, setExpanded] = useState<boolean | null>(null)
  const isThinking = streaming && !answerStarted
  const open = expanded ?? isThinking

  if (!text) return null

  return (
    <div className='flex flex-col gap-1'>
      <button
        type='button'
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setExpanded(!open)}
        className='flex items-center gap-1 self-start text-[var(--text-muted)] text-caption transition-colors hover:text-[var(--text-body)]'
      >
        <ChevronDown className={cn('size-[12px] transition-transform', !open && '-rotate-90')} />
        {isThinking ? t('inProgress') : t('title')}
      </button>
      {open && (
        <div
          id={contentId}
          className='max-h-[240px] overflow-y-auto whitespace-pre-wrap break-words border-[var(--border)] border-l pl-3 text-[var(--text-muted)] text-caption'
        >
          {text}
        </div>
      )}
    </div>
  )
}
