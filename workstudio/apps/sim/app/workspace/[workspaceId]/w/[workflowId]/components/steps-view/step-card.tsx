'use client'

import { memo, useState } from 'react'
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  OverflowText,
} from '@sim/emcn'
import { ArrowDown, ArrowUp, Check, Loader, MoreHorizontal, Play, Trash, X } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { explainStepError } from '@/lib/nexora/steps/errors'
import type { StepResult } from '@/lib/nexora/steps/results'
import { summarizeStep } from '@/lib/nexora/steps/summary'
import { BlockTile } from '@/blocks/block-tile'

const RESULT_MAX_CHARS = 3000

interface StepCardProps {
  blockId: string
  blockType: string
  name: string
  /** Catalog entry id; `null` for a block the catalog does not know (read-only view). */
  entryId: string | null
  /** The block with its current values, for the one-line summary. */
  block: { type: string; subBlocks?: unknown }
  number: number | null
  selected: boolean
  result: StepResult | undefined
  canEdit: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  /** Steps a removal takes with it (a condition's branches). */
  removalCount: number
  testDisabled: boolean
  onSelect: (blockId: string) => void
  onMove: (blockId: string, direction: 'up' | 'down') => void
  onRemove: (blockId: string, count: number) => void
  onTestUntil: (blockId: string) => void
}

function resultText(output: unknown): string {
  const content =
    typeof output === 'object' && output !== null && 'content' in output
      ? (output as { content: unknown }).content
      : output
  const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
  return (text ?? '').slice(0, RESULT_MAX_CHARS)
}

function StatusMark({ result }: { result: StepResult | undefined }) {
  const t = useTranslations('steps.test.status')
  if (!result || result.status === 'idle') return null
  return (
    <span
      className={cn(
        'flex items-center gap-1 text-caption',
        result.status === 'error' ? 'text-[var(--text-error)]' : 'text-[var(--text-muted)]'
      )}
    >
      {result.status === 'running' && <Loader className='size-[12px]' animate />}
      {result.status === 'success' && <Check className='size-[12px] text-[var(--brand-blue)]' />}
      {result.status === 'error' && <X className='size-[12px]' />}
      {t(result.status)}
    </span>
  )
}

function ErrorExplanation({ message }: { message: string }) {
  const t = useTranslations('steps')
  const explanation = explainStepError(message)
  return (
    <div
      role='alert'
      className='mt-2 flex flex-col gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-4)] p-3'
    >
      <span className='text-[var(--text-primary)] text-small'>{t('test.errorTitle')}</span>
      <span className='text-[var(--text-body)] text-small'>
        {t(`errors.${explanation.key}`, explanation.values)}
      </span>
      <span className='text-[var(--text-muted)] text-caption'>{t('test.fixHint')}</span>
      {message.trim() && (
        <details className='text-[var(--text-muted)] text-caption'>
          <summary className='cursor-pointer'>{t('test.originalMessage')}</summary>
          <pre className='mt-1 whitespace-pre-wrap break-words'>{message}</pre>
        </details>
      )}
    </div>
  )
}

/** One step of the workflow: what it is, what it does in a sentence, how its last test went. */
export const StepCard = memo(function StepCard({
  blockId,
  blockType,
  name,
  entryId,
  block,
  number,
  selected,
  result,
  canEdit,
  canMoveUp,
  canMoveDown,
  removalCount,
  testDisabled,
  onSelect,
  onMove,
  onRemove,
  onTestUntil,
}: StepCardProps) {
  const t = useTranslations('steps')
  const [showResult, setShowResult] = useState(false)
  const summary = summarizeStep(block)
  const summaryValues = summary
    ? summary.key === 'wait'
      ? { ...summary.values, unit: t(`summary.units.${summary.values.unit}`) }
      : summary.values
    : null
  const label = entryId ? t(`catalog.${entryId}.label`) : t('view.unknownBlock')

  return (
    <article
      aria-label={name}
      data-step-card={blockId}
      className={cn(
        'rounded-lg border bg-[var(--surface-5)] p-3 transition-colors',
        selected ? 'border-[var(--text-muted)]' : 'border-[var(--border)]',
        result?.status === 'error' && 'border-[var(--text-error)]'
      )}
    >
      <div className='flex items-center gap-3'>
        <button
          type='button'
          onClick={() => onSelect(blockId)}
          aria-label={`${t('view.open')} — ${name}`}
          className='flex min-w-0 flex-1 items-center gap-3 text-left'
        >
          <BlockTile blockType={blockType} size='lg' />
          <span className='flex min-w-0 flex-1 flex-col'>
            <span className='flex items-center gap-2'>
              {number !== null && (
                <span className='text-[var(--text-muted)] text-caption'>
                  {t('view.stepNumber', { number })}
                </span>
              )}
              <span className='text-[var(--text-muted)] text-caption'>{label}</span>
            </span>
            <OverflowText label={name} className='text-[var(--text-primary)] text-small' />
            {summary && summaryValues && (
              <OverflowText
                label={t(`summary.${summary.key}`, summaryValues)}
                className='text-[var(--text-secondary)] text-caption'
              />
            )}
          </span>
        </button>
        <StatusMark result={result} />
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='quiet' size='icon' aria-label={`${t('view.open')} — ${name}`}>
                <MoreHorizontal className='size-[14px]' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' side='bottom' sideOffset={6}>
              <DropdownMenuItem onSelect={() => onSelect(blockId)}>
                {t('view.open')}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={testDisabled} onSelect={() => onTestUntil(blockId)}>
                <Play />
                {t('test.runUntil')}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canMoveUp} onSelect={() => onMove(blockId, 'up')}>
                <ArrowUp />
                {t('view.moveUp')}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canMoveDown} onSelect={() => onMove(blockId, 'down')}>
                <ArrowDown />
                {t('view.moveDown')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onRemove(blockId, removalCount)}>
                <Trash />
                {removalCount > 0
                  ? t('view.removeWithBranches', { count: removalCount })
                  : t('view.remove')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {result?.status === 'error' && <ErrorExplanation message={result.error ?? ''} />}
      {result?.status === 'success' && (
        <div className='mt-2'>
          <Button variant='ghost' size='sm' onClick={() => setShowResult((shown) => !shown)}>
            {showResult ? t('test.hideResult') : t('test.showResult')}
            {result.durationMs !== undefined && (
              <span className='ml-2 text-[var(--text-muted)]'>
                {t('test.duration', { seconds: (result.durationMs / 1000).toFixed(1) })}
              </span>
            )}
          </Button>
          {showResult && (
            <pre className='mt-1 max-h-[240px] overflow-auto whitespace-pre-wrap break-words rounded-md bg-[var(--surface-4)] p-3 text-[var(--text-body)] text-caption'>
              {resultText(result.output) || t('test.noResult')}
            </pre>
          )}
        </div>
      )}
    </article>
  )
})
