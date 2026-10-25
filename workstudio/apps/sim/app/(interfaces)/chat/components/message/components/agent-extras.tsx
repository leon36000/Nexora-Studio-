'use client'

import { Download } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import type { ProducedFile } from '@/lib/nexora/agent-extras'
import { type CitationSource, citedSourceIndexes } from '@/lib/nexora/citations'

/**
 * « Sources [1] [2] » under an answer: the sources the answer cites, or — when it cites none — the
 * ones its searches consulted. Each is a link when it has one (a document of the workspace, a
 * connector's page, a web page).
 */
export function SourcesFooter({ answer, sources }: { answer: string; sources: CitationSource[] }) {
  const t = useTranslations('interfaces.chat.agentExtras')
  if (sources.length === 0) return null
  const cited = citedSourceIndexes(
    answer,
    sources.map((source) => source.index)
  )
  const shown =
    cited.length > 0 ? sources.filter((source) => cited.includes(source.index)) : sources
  const ordered = [...shown].sort(
    (left, right) => (cited.indexOf(left.index) + 1 || 99) - (cited.indexOf(right.index) + 1 || 99)
  )
  return (
    <section aria-label={t('sources')} className='flex flex-col gap-1'>
      <h3 className='font-medium text-[var(--text-muted)] text-caption'>
        {cited.length > 0 ? t('sources') : t('sourcesConsulted')}
      </h3>
      <ol className='flex flex-wrap gap-1.5'>
        {ordered.map((source) => {
          const label = `[${source.index}] ${source.title}`
          const className =
            'inline-flex max-w-[22rem] items-center truncate rounded-md border border-[var(--border)] px-2 py-1 text-[var(--text-secondary)] text-caption'
          return (
            <li key={source.index} id={`source-${source.index}`}>
              {source.url ? (
                <a
                  href={source.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  title={source.excerpt}
                  aria-label={t('openSource', { index: source.index, title: source.title })}
                  className={`${className} hover:border-[var(--border-1)] hover:text-[var(--text-primary)]`}
                >
                  {label}
                </a>
              ) : (
                <span title={source.excerpt} className={className}>
                  {label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/** The files the agent's tools produced: a picture is shown, anything else offered to download. */
export function ProducedFiles({ files }: { files: ProducedFile[] }) {
  const t = useTranslations('interfaces.chat.agentExtras')
  if (files.length === 0) return null
  return (
    <section aria-label={t('files')} className='flex flex-col gap-2'>
      {files
        .filter((file) => file.type.startsWith('image/'))
        .map((file) => (
          <img
            key={file.url}
            src={file.url}
            alt={t('imageAlt', { name: file.name })}
            className='max-h-[420px] w-auto max-w-full self-start rounded-lg border border-[var(--border)]'
          />
        ))}
      <ul className='flex flex-wrap gap-1.5'>
        {files.map((file) => (
          <li key={file.url}>
            <a
              href={file.url}
              download={file.name}
              aria-label={t('download', { name: file.name })}
              className='inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-2 py-1 text-[var(--text-secondary)] text-caption hover:border-[var(--border-1)] hover:text-[var(--text-primary)]'
            >
              <Download className='size-[13px]' />
              {file.name}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

type ConfirmationState = 'pending' | 'allowed' | 'denied' | 'expired'

export interface ConfirmationCardProps {
  title: string
  summary: string
  state: ConfirmationState
  /** The answer is on its way. */
  busy: boolean
  /** The answer could not be sent or was refused as stale. */
  problem: 'failed' | 'already-answered' | null
  onAnswer: (decision: 'allow' | 'deny') => void
}

/** « Autoriser / Refuser »: the agent waits for this before it runs an action that writes. */
export function ConfirmationCard({
  title,
  summary,
  state,
  busy,
  problem,
  onAnswer,
}: ConfirmationCardProps) {
  const t = useTranslations('interfaces.chat.agentExtras.confirm')
  return (
    <section
      role='group'
      aria-label={t('title')}
      className='flex flex-col gap-2 rounded-lg border border-[var(--border-1)] bg-[var(--surface-2)] p-3'
    >
      <p className='font-medium text-[var(--text-body)] text-sm'>{t('title')}</p>
      <p className='break-all font-mono text-[var(--text-secondary)] text-caption'>{title}</p>
      {summary && (
        <pre className='max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-md bg-[var(--surface-4)] p-2 text-[var(--text-muted)] text-caption'>
          {summary}
        </pre>
      )}
      {state === 'pending' ? (
        <div className='flex items-center gap-2'>
          <button
            type='button'
            disabled={busy}
            onClick={() => onAnswer('allow')}
            className='rounded-md bg-[var(--text-primary)] px-3 py-1 text-[var(--text-inverse)] text-small disabled:opacity-50'
          >
            {t('allow')}
          </button>
          <button
            type='button'
            disabled={busy}
            onClick={() => onAnswer('deny')}
            className='rounded-md border border-[var(--border-1)] px-3 py-1 text-[var(--text-secondary)] text-small disabled:opacity-50'
          >
            {t('deny')}
          </button>
          <span className='text-[var(--text-muted)] text-caption'>{t('pending')}</span>
        </div>
      ) : (
        <p role='status' className='text-[var(--text-muted)] text-caption'>
          {t(state)}
        </p>
      )}
      {problem && (
        <p role='alert' className='text-[var(--text-error)] text-caption'>
          {problem === 'failed' ? t('failed') : t('alreadyAnswered')}
        </p>
      )}
    </section>
  )
}
