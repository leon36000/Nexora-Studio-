'use client'

import { Button, Tooltip } from '@sim/emcn'
import { X } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { ModelPicker } from '@/app/workspace/[workspaceId]/agents/components/model-picker'
import type {
  PlaygroundErrorCode,
  PlaygroundUsage,
} from '@/app/workspace/[workspaceId]/playground/stream-answer'

/** One column's latest answer. */
export interface ColumnRun {
  text: string
  status: 'streaming' | 'done' | 'stopped' | 'error'
  latencyMs?: number
  usage?: PlaygroundUsage | null
  error?: PlaygroundErrorCode
}

interface PlaygroundColumnProps {
  model: string
  run: ColumnRun | undefined
  onModelChange: (model: string) => void
  /** Absent for the last remaining column. */
  onRemove?: () => void
  disabled: boolean
}

/** A model picker above the model's streamed answer, its latency and its token usage. */
export function PlaygroundColumn({
  model,
  run,
  onModelChange,
  onRemove,
  disabled,
}: PlaygroundColumnProps) {
  const t = useTranslations('agents.playground')

  return (
    <article className='flex min-w-0 flex-col gap-2 rounded-lg border border-[var(--border)] p-3'>
      <div className='flex items-center gap-1'>
        <ModelPicker
          value={model}
          onChange={onModelChange}
          disabled={disabled}
          className='min-w-0 flex-1'
        />
        {onRemove && (
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button
                type='button'
                variant='quiet'
                size='icon'
                onClick={onRemove}
                aria-label={t('removeModel')}
              >
                <X className='size-[14px]' />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>{t('removeModel')}</Tooltip.Content>
          </Tooltip.Root>
        )}
      </div>
      <div className='min-h-[160px] whitespace-pre-wrap break-words text-[var(--text-body)] text-sm'>
        {run?.text ? (
          run.text
        ) : (
          <span className='text-[var(--text-muted)]'>{run ? '…' : t('empty')}</span>
        )}
      </div>
      {run && run.status !== 'streaming' && (
        <footer className='flex flex-wrap gap-x-3 gap-y-1 text-caption'>
          {run.status === 'error' && (
            <span className='text-[var(--text-error)]'>
              {t(`errors.${run.error ?? 'unknown'}`)}
            </span>
          )}
          {run.status === 'stopped' && (
            <span className='text-[var(--text-muted)]'>{t('stopped')}</span>
          )}
          {run.latencyMs !== undefined && (
            <span className='text-[var(--text-muted)]'>
              {t('latency', { seconds: Math.round(run.latencyMs / 100) / 10 })}
            </span>
          )}
          {run.usage && (
            <span className='text-[var(--text-muted)]'>
              {t('tokens', {
                prompt: run.usage.promptTokens,
                completion: run.usage.completionTokens,
              })}
            </span>
          )}
        </footer>
      )}
    </article>
  )
}
