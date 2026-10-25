'use client'

import { useMemo, useState } from 'react'
import { Badge, cn, Skeleton } from '@sim/emcn'
import { Lock } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import type { NexoraTraceSpan } from '@/lib/api/contracts/nexora-traces'
import { protectionLines } from '@/app/workspace/[workspaceId]/traces/utils/protection'
import {
  flattenSpanTree,
  formatCo2,
  formatDuration,
} from '@/app/workspace/[workspaceId]/traces/utils/span-tree'
import { useNexoraTrace } from '@/hooks/queries/nexora-traces'

const KIND_VARIANT = {
  model: 'blue',
  tool: 'orange',
  knowledge: 'teal',
  delegation: 'purple',
  step: 'gray',
} as const

interface TraceDetailProps {
  scope: string
  traceId: string
  locale: string
}

function Content({ label, text }: { label: string; text: string | null }) {
  const t = useTranslations('traces.detail')
  return (
    <section className='flex flex-col gap-1'>
      <h3 className='font-medium text-[var(--text-secondary)] text-caption'>{label}</h3>
      {text ? (
        <pre className='max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border border-[var(--border)] bg-[var(--surface-3)] p-2 font-mono text-[var(--text-body)] text-caption'>
          {text}
        </pre>
      ) : (
        <p className='text-[var(--text-muted)] text-caption'>{t('noContent')}</p>
      )}
    </section>
  )
}

function SpanContent({ span }: { span: NexoraTraceSpan }) {
  const t = useTranslations('traces.detail')
  const reasoning = typeof span.attributes.reasoning === 'string' ? span.attributes.reasoning : null
  return (
    <div className='flex flex-col gap-3'>
      <Content label={t('input')} text={span.input} />
      <Content label={t('output')} text={span.output} />
      {reasoning && <Content label={t('reasoning')} text={reasoning} />}
      {span.attributes.interrupted === true && (
        <p className='text-[var(--text-muted)] text-caption'>{t('interrupted')}</p>
      )}
    </div>
  )
}

/** One trace: its figures, the tree of its steps (model → tool → model…), and the selected step's content. */
export function TraceDetail({ scope, traceId, locale }: TraceDetailProps) {
  const t = useTranslations('traces')
  const { data, isPending, isError } = useNexoraTrace(scope, traceId)
  const [selection, setSelection] = useState<{ traceId: string; spanId: string } | null>(null)
  const rows = useMemo(() => flattenSpanTree(data?.spans ?? []), [data?.spans])
  const protection = useMemo(() => protectionLines(data?.spans ?? []), [data?.spans])

  if (isPending) return <Skeleton className='h-64 w-full rounded-lg' />
  if (isError || !data) {
    return <p className='text-[var(--text-muted)] text-small'>{t('detail.notFound')}</p>
  }
  const { trace } = data
  const selected =
    rows.find((row) => selection?.traceId === traceId && row.span.id === selection.spanId)?.span ??
    rows.find((row) => row.span.kind === 'model')?.span ??
    rows[0]?.span
  const startMs = new Date(trace.startedAt).getTime()
  const total = Math.max(trace.durationMs, 1)

  return (
    <div className='flex flex-col gap-4'>
      <header className='flex flex-col gap-2'>
        <div className='flex items-center gap-2'>
          <h2 className='min-w-0 flex-1 truncate font-medium text-[var(--text-body)] text-base'>
            {trace.name}
          </h2>
          {trace.visibility === 'private' && (
            <Lock
              aria-label={t('detail.privateNote')}
              className='size-[14px] text-[var(--text-icon)]'
            />
          )}
          <Badge variant={trace.status === 'error' ? 'red' : 'green'} size='sm'>
            {trace.status === 'error' ? t('list.error') : t('list.ok')}
          </Badge>
        </div>
        <dl className='grid grid-cols-2 gap-x-4 gap-y-1 text-caption sm:grid-cols-3'>
          {[
            [t('detail.source'), t(`sources.${trace.source}` as 'sources.agent')],
            [t('detail.model'), trace.model ?? '—'],
            [t('detail.duration'), formatDuration(trace.durationMs, locale)],
            [t('detail.tokensIn'), String(trace.inputTokens)],
            [t('detail.tokensOut'), String(trace.outputTokens)],
            [t('detail.co2'), formatCo2(trace.kgCo2eq, locale)],
          ].map(([label, value]) => (
            <div key={label} className='flex flex-col'>
              <dt className='text-[var(--text-muted)]'>{label}</dt>
              <dd className='truncate text-[var(--text-body)]'>{value}</dd>
            </div>
          ))}
        </dl>
        {trace.error && (
          <p className='text-[var(--badge-error-text)] text-caption'>
            {t('detail.error')} : {trace.error}
          </p>
        )}
        {protection.map((line) => {
          const items = line.found
            .map(({ entity, count }) =>
              t('detail.protectionItem', {
                entity: t.has(`protectionEntities.${entity}`)
                  ? t(`protectionEntities.${entity}` as 'protectionEntities.PERSON')
                  : entity,
                count,
              })
            )
            .join(', ')
          return (
            <p
              key={`${line.mode}-${line.model}`}
              className='text-[var(--text-secondary)] text-caption'
            >
              {t(line.mode === 'mask' ? 'detail.protectionMask' : 'detail.protectionRefuse', {
                model: line.model,
                items,
              })}
            </p>
          )
        })}
        <div className='flex flex-wrap gap-x-4 text-[var(--text-muted)] text-caption'>
          {trace.visibility === 'private' && <span>{t('detail.privateNote')}</span>}
          {trace.maskedCount > 0 && <span>{t('detail.masked', { count: trace.maskedCount })}</span>}
          {trace.truncated && <span>{t('detail.truncated')}</span>}
        </div>
      </header>

      <section className='flex flex-col gap-1'>
        <h3 className='font-medium text-[var(--text-secondary)] text-caption'>
          {t('detail.spansTitle')}
        </h3>
        <ul className='flex flex-col'>
          {rows.map(({ span, depth }) => {
            const offset = Math.min(
              100,
              Math.max(0, ((new Date(span.startedAt).getTime() - startMs) / total) * 100)
            )
            const width = Math.min(100 - offset, Math.max(1, (span.durationMs / total) * 100))
            return (
              <li key={span.id}>
                <button
                  type='button'
                  aria-pressed={span.id === selected?.id}
                  onClick={() => setSelection({ traceId, spanId: span.id })}
                  style={{ paddingLeft: `${depth * 16 + 8}px` }}
                  className={cn(
                    'flex w-full flex-col gap-1 rounded-md py-1 pr-2 text-left hover-hover:bg-[var(--surface-4)]',
                    span.id === selected?.id && 'bg-[var(--surface-4)]'
                  )}
                >
                  <span className='flex items-center gap-2'>
                    <Badge variant={KIND_VARIANT[span.kind]} size='sm'>
                      {t(`kinds.${span.kind}`)}
                    </Badge>
                    <span className='min-w-0 flex-1 truncate text-[var(--text-body)] text-small'>
                      {span.name}
                    </span>
                    {span.status === 'error' && (
                      <Badge variant='red' size='sm'>
                        {t('list.error')}
                      </Badge>
                    )}
                    <span className='shrink-0 text-[var(--text-muted)] text-caption'>
                      {span.inputTokens + span.outputTokens > 0 &&
                        `${t('list.tokens', { count: span.inputTokens + span.outputTokens })} · `}
                      {formatDuration(span.durationMs, locale)}
                    </span>
                  </span>
                  <span className='relative block h-1 w-full rounded-full bg-[var(--surface-5)]'>
                    <span
                      className={cn(
                        'absolute inset-y-0 rounded-full',
                        span.status === 'error'
                          ? 'bg-[var(--badge-error-text)]'
                          : 'bg-[var(--text-icon)]'
                      )}
                      style={{ left: `${offset}%`, width: `${width}%` }}
                    />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {selected && <SpanContent span={selected} />}
    </div>
  )
}
