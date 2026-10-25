'use client'

import { useState } from 'react'
import { ChipLink, ChipSwitch, ChipTag } from '@sim/emcn'
import { ArrowLeft, Loader } from '@sim/emcn/icons'
import { useLocale, useTranslations } from 'next-intl'
import { parseAsString, useQueryStates } from 'nuqs'
import type { NexoraEvalComparison } from '@/lib/api/contracts/nexora-evaluations'
import { SummaryTable } from '@/app/workspace/[workspaceId]/evaluations/components/summary-table'
import { VerdictTag } from '@/app/workspace/[workspaceId]/evaluations/components/verdict-tag'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import { formatDuration } from '@/app/workspace/[workspaceId]/traces/utils/span-tree'
import { useEvalComparison } from '@/hooks/queries/nexora-evaluations'

interface ComparisonProps {
  workspaceId: string
}

const FILTERS = ['all', 'differences', 'regressed', 'improved'] as const
type Filter = (typeof FILTERS)[number]

function isFilter(value: string): value is Filter {
  return FILTERS.some((filter) => filter === value)
}

type Row = NexoraEvalComparison['rows'][number]

function matches(filter: Filter, row: Row): boolean {
  if (filter === 'all') return true
  if (filter === 'regressed') return row.change === 'regressed'
  if (filter === 'improved') return row.change === 'improved'
  return row.change !== 'same'
}

const comparisonParsers = {
  a: parseAsString.withDefault(''),
  b: parseAsString.withDefault(''),
} as const

interface SideCellProps {
  item: Row['a']
  locale: string
}

function SideCell({ item, locale }: SideCellProps) {
  if (!item) return <span className='text-[var(--text-muted)]'>—</span>
  return (
    <div className='flex flex-col gap-1'>
      <div className='flex items-center gap-1'>
        <VerdictTag verdict={item.verdict} status={item.verdict === 'error' ? 'error' : 'done'} />
        {item.latencyMs !== null && (
          <span className='text-[var(--text-muted)] text-caption'>
            {formatDuration(item.latencyMs, locale)}
          </span>
        )}
      </div>
      <p className='line-clamp-4 text-[var(--text-body)] text-caption'>{item.answer}</p>
    </div>
  )
}

/**
 * Nexora edition: two series — a target of a campaign each — compared row by row. `a` is the
 * reference: a row is « improved » when only `b` passes it, « regressed » when only `a` does.
 */
export function Comparison({ workspaceId }: ComparisonProps) {
  const t = useTranslations('evaluations.comparison')
  const locale = useLocale()
  const [{ a, b }] = useQueryStates(comparisonParsers, { history: 'replace', clearOnDefault: true })
  const { data, isLoading, isError } = useEvalComparison(workspaceId, a, b)
  const [filter, setFilter] = useState<Filter>('all')

  const back = (
    <ChipLink
      href={`/workspace/${workspaceId}/evaluations`}
      leftIcon={ArrowLeft}
      className='self-start'
    >
      {t('back')}
    </ChipLink>
  )

  if (isLoading || isError || !data) {
    return (
      <div className='min-h-0 flex-1 overflow-y-auto px-6'>
        <div className='mx-auto flex w-full max-w-[64rem] flex-col gap-6 py-10'>
          {back}
          {isLoading ? (
            <Loader className='size-[16px] text-[var(--text-muted)]' animate />
          ) : (
            <p className='text-[var(--text-error)] text-small'>{t('loadFailed')}</p>
          )}
        </div>
      </div>
    )
  }

  const label = (side: NexoraEvalComparison['a']) => `${side.campaignName} · ${side.targetLabel}`
  const shown = data.rows.filter((row) => matches(filter, row))

  return (
    <div className='min-h-0 flex-1 overflow-y-auto px-6'>
      <div className='mx-auto flex w-full max-w-[64rem] flex-col gap-7 py-10'>
        <header className='flex flex-col gap-3'>
          {back}
          <h1 className='font-medium text-[var(--text-body)] text-lg'>{t('title')}</h1>
        </header>

        <SettingsSection label={t('statistics')}>
          <SummaryTable
            rows={[
              { key: 'a', label: `A — ${label(data.a)}`, summary: data.a.summary },
              { key: 'b', label: `B — ${label(data.b)}`, summary: data.b.summary },
            ]}
          />
        </SettingsSection>

        <SettingsSection label={t('rows')}>
          <div className='flex flex-col gap-3'>
            <div className='flex flex-wrap items-center gap-2'>
              <ChipTag variant='gray'>
                {t('counts.improved', { count: data.counts.improved })}
              </ChipTag>
              <ChipTag variant='gray' invalid={data.counts.regressed > 0}>
                {t('counts.regressed', { count: data.counts.regressed })}
              </ChipTag>
              <ChipTag variant='gray'>{t('counts.same', { count: data.counts.same })}</ChipTag>
              {data.counts.onlyA + data.counts.onlyB > 0 && (
                <ChipTag variant='gray'>
                  {t('counts.missing', { count: data.counts.onlyA + data.counts.onlyB })}
                </ChipTag>
              )}
            </div>
            <ChipSwitch
              aria-label={t('rows')}
              className='self-start'
              options={FILTERS.map((value) => ({ value, label: t(`filters.${value}`) }))}
              value={filter}
              onChange={(value) => isFilter(value) && setFilter(value)}
            />
            <div className='overflow-x-auto rounded-lg border border-[var(--border)]'>
              <table className='w-full min-w-[44rem] table-fixed text-left text-small'>
                <thead className='text-[var(--text-muted)] text-caption'>
                  <tr className='border-[var(--border)] border-b'>
                    <th className='w-[26%] px-3 py-2 font-normal'>{t('question')}</th>
                    <th className='px-3 py-2 font-normal'>A</th>
                    <th className='px-3 py-2 font-normal'>B</th>
                    <th className='w-28 px-3 py-2 font-normal'>{t('change')}</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-[var(--border)] align-top'>
                  {shown.map((row) => (
                    <tr key={row.rowId}>
                      <td className='px-3 py-2 text-[var(--text-body)]'>
                        <p className='line-clamp-3'>{row.input}</p>
                      </td>
                      <td className='px-3 py-2'>
                        <SideCell item={row.a} locale={locale} />
                      </td>
                      <td className='px-3 py-2'>
                        <SideCell item={row.b} locale={locale} />
                      </td>
                      <td className='px-3 py-2'>
                        <ChipTag variant='gray' invalid={row.change === 'regressed'}>
                          {t(`changes.${row.change}`)}
                        </ChipTag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  )
}
