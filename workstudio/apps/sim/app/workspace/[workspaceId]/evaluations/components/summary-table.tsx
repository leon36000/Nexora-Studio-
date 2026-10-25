'use client'

import { useLocale, useTranslations } from 'next-intl'
import type { NexoraEvalSummary } from '@/lib/api/contracts/nexora-evaluations'
import {
  formatCount,
  formatRate,
  formatScore,
} from '@/app/workspace/[workspaceId]/evaluations/utils/format'
import { formatCo2, formatDuration } from '@/app/workspace/[workspaceId]/traces/utils/span-tree'

interface SummaryRow {
  key: string
  label: string
  summary: NexoraEvalSummary
}

interface SummaryTableProps {
  rows: SummaryRow[]
}

/**
 * The statistics of each target side by side: pass rate, mean grade, p50 and p95 of the latency,
 * tokens and carbon. The best pass rate is marked when there are several targets.
 */
export function SummaryTable({ rows }: SummaryTableProps) {
  const t = useTranslations('evaluations.summary')
  const locale = useLocale()
  const best = Math.max(...rows.map((row) => row.summary.passRate ?? -1))
  const showScores = rows.some((row) => row.summary.meanScore !== null)

  return (
    <div className='overflow-x-auto rounded-lg border border-[var(--border)]'>
      <table className='w-full min-w-[40rem] text-left text-small'>
        <thead className='text-[var(--text-muted)] text-caption'>
          <tr className='border-[var(--border)] border-b'>
            <th className='px-3 py-2 font-normal'>{t('target')}</th>
            <th className='px-3 py-2 text-right font-normal'>{t('passRate')}</th>
            {showScores && <th className='px-3 py-2 text-right font-normal'>{t('meanScore')}</th>}
            <th className='px-3 py-2 text-right font-normal'>{t('latencyP50')}</th>
            <th className='px-3 py-2 text-right font-normal'>{t('latencyP95')}</th>
            <th className='px-3 py-2 text-right font-normal'>{t('tokens')}</th>
            <th className='px-3 py-2 text-right font-normal'>{t('co2')}</th>
            <th className='px-3 py-2 text-right font-normal'>{t('errors')}</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-[var(--border)] text-[var(--text-body)]'>
          {rows.map(({ key, label, summary }) => (
            <tr key={key}>
              <th scope='row' className='px-3 py-2 font-normal'>
                {label}
              </th>
              <td
                className='px-3 py-2 text-right'
                title={t('passed', { passed: summary.passed, finished: summary.finished })}
              >
                <span
                  className={
                    rows.length > 1 && summary.passRate !== null && summary.passRate === best
                      ? 'font-medium'
                      : undefined
                  }
                >
                  {formatRate(summary.passRate, locale)}
                </span>
                <span className='ml-1 text-[var(--text-muted)] text-caption'>
                  {summary.passed}/{summary.finished}
                </span>
              </td>
              {showScores && (
                <td className='px-3 py-2 text-right'>{formatScore(summary.meanScore, locale)}</td>
              )}
              <td className='px-3 py-2 text-right'>
                {summary.latencyP50 === null ? '—' : formatDuration(summary.latencyP50, locale)}
              </td>
              <td className='px-3 py-2 text-right'>
                {summary.latencyP95 === null ? '—' : formatDuration(summary.latencyP95, locale)}
              </td>
              <td className='px-3 py-2 text-right'>
                {formatCount(summary.inputTokens + summary.outputTokens, locale)}
              </td>
              <td className='px-3 py-2 text-right'>{formatCo2(summary.kgCo2eq, locale)}</td>
              <td className='px-3 py-2 text-right'>{formatCount(summary.errors, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
